// Vercel Edge Function: server-side LLM proxy.
//
// All provider API keys live here as NON-public environment variables (no VITE_
// prefix), so they are never bundled into the browser. The frontend calls
// POST /api/llm with a { tier, messages } payload; this file owns provider
// selection, key rotation and fallback, then either streams the OpenAI-style
// SSE straight back (stream:true) or returns { text } (stream:false).
//
// Model strategy - each tier is matched to a different top open model so the
// pipeline exploits the full range instead of calling one model everywhere:
//   synth  final search answer  -> DeepSeek-V3 (deepest synthesis)
//   fast   worker/analyst draft -> Qwen3-235B (strong + quick MoE)
//   chat   chatbot + terminal   -> gpt-oss-120b (sharp conversational)
//   web    live web search      -> Groq compound (only one with built-in web)
// The `:cheapest` suffix keeps the SAME model but routes to the lowest-price
// HF provider, so it conserves credits without touching output quality.

export const config = { runtime: 'edge' };

type Tier = 'fast' | 'synth' | 'web' | 'chat';

interface Provider {
  name: string;
  url: string;
  keys: string[];
  models: Partial<Record<Tier, string | string[]>>;
  extraHeaders?: Record<string, string>;
}

const ENV: Record<string, string | undefined> =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) ?? {};

function envKeys(...names: string[]): string[] {
  return names
    .map(n => ENV[n])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim());
}

function buildPool(): Provider[] {
  const pool: Provider[] = [];

  const groq = envKeys('GROQ_API_KEY', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_SEARCH_API_KEY');
  if (groq.length) {
    pool.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      keys: groq,
      models: {
        fast: 'llama-3.1-8b-instant',
        synth: 'llama-3.3-70b-versatile',
        chat: 'llama-3.3-70b-versatile',
        // Full `compound` 413s on every key on our plan (Request Entity Too
        // Large, i.e. plan-tier restriction, not transient) - verified live,
        // so trying it first just burns 2 guaranteed-dead attempts on every
        // search. `compound-mini` is the one that actually answers.
        web: 'groq/compound-mini',
      },
    });
  }

  const hf = envKeys('HF_API_KEY', 'HF_API_KEY_2', 'HF_API_KEY_3', 'HF_API_KEY_4');
  if (hf.length) {
    pool.push({
      name: 'huggingface',
      url: 'https://router.huggingface.co/v1/chat/completions',
      keys: hf,
      models: {
        synth: ['deepseek-ai/DeepSeek-V3-0324:cheapest', 'openai/gpt-oss-120b:cheapest'],
        fast: ['Qwen/Qwen3-235B-A22B-Instruct-2507:cheapest', 'openai/gpt-oss-20b:cheapest'],
        chat: ['openai/gpt-oss-120b:cheapest', 'Qwen/Qwen3-235B-A22B-Instruct-2507:cheapest'],
      },
    });
  }

  const cerebras = envKeys('CEREBRAS_API_KEY', 'CEREBRAS_API_KEY_2');
  if (cerebras.length) {
    pool.push({
      name: 'cerebras',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      keys: cerebras,
      models: { fast: 'gpt-oss-120b', synth: 'gpt-oss-120b', chat: 'gpt-oss-120b' },
    });
  }

  const gemini = envKeys('GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4');
  if (gemini.length) {
    pool.push({
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      keys: gemini,
      models: { fast: 'gemini-2.5-flash-lite', synth: 'gemini-2.5-flash', chat: 'gemini-2.5-flash' },
    });
  }

  return pool;
}

const POOL = buildPool();

// Preference order per tier, used whenever the caller doesn't force a
// specific provider (see `provider` override below, used by the search
// page's Photon/Core/Pro model toggle). Groq/Cerebras lead by default so
// every ambient call site (chatbot, imagine suggestions, etc.) stays fast;
// HF is reserved for whoever explicitly opts into it via the override,
// since its answers are genuinely better reasoned but its throughput is
// slower and less consistent (measured live: 7-26s full streams).
const TIER_ORDER: Record<Tier, string[]> = {
  synth: ['groq', 'cerebras', 'huggingface', 'gemini'],
  fast: ['cerebras', 'groq', 'huggingface', 'gemini'],
  chat: ['groq', 'huggingface', 'cerebras', 'gemini'],
  web: ['groq'],
};

function chainFor(tier: Tier): Provider[] {
  return (TIER_ORDER[tier] ?? [])
    .map(n => POOL.find(p => p.name === n))
    .filter((p): p is Provider => !!p && !!p.models[tier]);
}

function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface UpstreamBody {
  messages: unknown;
  maxTokens?: number;
  temperature?: number;
  stream: boolean;
}

// Bounds only the "is this provider even responding" phase. Without it, a
// single slow/hung attempt (HF queueing behind shared GPU capacity, a dead
// key, a network stall) blocks the whole fallback chain - with 4 keys x 2
// models per tier that is how a search balloons to 30s+. The timer is
// cleared as soon as a response comes back ok (see call sites below), so it
// never cuts off a legitimately-streaming or still-generating response -
// only attempts that never even connect in time.
const UPSTREAM_CONNECT_TIMEOUT_MS = 8000;

// Max time to wait, after a successful connect, for the first chunk with
// real delta.content - bounds how long a reasoning model can stay silent
// before we give up on it and fall through to the next candidate.
const FIRST_TOKEN_TIMEOUT_MS = 4000;

function callUpstream(
  provider: Provider,
  key: string,
  model: string,
  body: UpstreamBody,
): { response: Promise<Response>; clearTimeout: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_CONNECT_TIMEOUT_MS);
  const response = fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...provider.extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: body.maxTokens ?? 900,
      temperature: body.temperature ?? 0.4,
      stream: body.stream,
      messages: body.messages,
    }),
    signal: controller.signal,
  });
  return { response, clearTimeout: () => clearTimeout(timer) };
}

// HF's reasoning models (gpt-oss-120b, DeepSeek-V3) can connect fast (200 +
// body) but then emit a stretch of hidden "thinking" chunks with empty
// delta.content before the real answer starts - the connect succeeds
// instantly while the user-visible stream stays blank for many seconds.
// This peeks the stream for the first chunk with real content and only
// commits to this provider once that arrives; if it takes too long, the
// attempt is cancelled so the chain can fall through to the next candidate
// instead of leaving the client staring at nothing.
async function commitOnFirstToken(
  body: ReadableStream<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStream<Uint8Array> | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const buffered: Uint8Array[] = [];
  let textBuffer = '';
  let sawContent = false;
  let streamEnded = false;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const timedOut = Symbol('timeout');
    const result = await Promise.race([
      reader.read(),
      new Promise<typeof timedOut>(resolve => setTimeout(() => resolve(timedOut), remaining)),
    ]);
    if (result === timedOut) break;

    const { done, value } = result as ReadableStreamReadResult<Uint8Array>;
    if (done) { streamEnded = true; break; }
    buffered.push(value);
    textBuffer += decoder.decode(value, { stream: true });
    const lines = textBuffer.split('\n');
    textBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload);
        if (chunk?.choices?.[0]?.delta?.content) { sawContent = true; break; }
      } catch {
        // ignore malformed keep-alive chunks
      }
    }
    if (sawContent) break;
  }

  if (!sawContent && !streamEnded) {
    reader.cancel().catch(() => {});
    return null;
  }
  if (!sawContent && streamEnded) return null; // finished with no real content at all

  // Replay what was already buffered while peeking, then keep piping the
  // rest of the live stream through untouched.
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of buffered) controller.enqueue(chunk);
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      controller.enqueue(value);
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: {
    tier?: Tier; messages?: unknown; maxTokens?: number; temperature?: number; stream?: boolean;
    // Forces a single named provider instead of the tier's default fallback
    // order - used by the search page's Photon/Core/Pro model toggle so the
    // visitor can explicitly pick speed vs HF's deeper reasoning.
    provider?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const tier = body.tier;
  const messages = body.messages;
  if (!tier || !Array.isArray(messages)) return json({ error: 'missing tier or messages' }, 400);

  const chain = body.provider
    ? POOL.filter(p => p.name === body.provider && !!p.models[tier])
    : chainFor(tier);
  if (!chain.length) return json({ error: `no provider configured for tier ${tier}` }, 503);

  const wantStream = body.stream !== false; // default to streaming
  const upstream: UpstreamBody = {
    messages,
    maxTokens: body.maxTokens,
    temperature: body.temperature,
    stream: wantStream,
  };

  // Hard ceiling on total time spent falling through key/model/provider
  // combinations before giving up. Individual connect attempts are already
  // bounded (UPSTREAM_CONNECT_TIMEOUT_MS), but a chain that keeps getting
  // fast real responses that are just all 429/413 (seen in practice on
  // Groq's compound model once its daily cap is hit) can still rack up
  // 20s+ across 8 sequential attempts. This bounds the whole search.
  const CHAIN_DEADLINE_MS = 15000;
  const chainStartedAt = Date.now();

  if (wantStream) {
    // Pick the first provider/key that returns a 200 stream and pipe its SSE
    // through untouched (all providers are OpenAI-compatible, so the browser
    // parser is identical regardless of which one answered).
    for (const provider of chain) {
      for (const model of asArray(provider.models[tier]!)) {
        for (const key of provider.keys) {
          if (Date.now() - chainStartedAt > CHAIN_DEADLINE_MS) {
            return json({ error: 'all providers failed (deadline exceeded)' }, 502);
          }
          const { response, clearTimeout: clear } = callUpstream(provider, key, model, upstream);
          try {
            const up = await response;
            if (up.ok && up.body) {
              clear();
              // Confirm real content actually starts flowing before
              // committing to this provider - a fast connect can still sit
              // silent for many seconds behind hidden reasoning tokens.
              const live = await commitOnFirstToken(up.body, FIRST_TOKEN_TIMEOUT_MS);
              if (live) {
                return new Response(live, {
                  headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'X-Accel-Buffering': 'no',
                    'X-LLM-Provider': provider.name,
                  },
                });
              }
              // Went quiet past the deadline (or ended with no content) -
              // fall through to the next key/model/provider.
              continue;
            }
            clear();
          } catch {
            clear();
            // network error or connect timeout - try the next key/model/provider
          }
        }
      }
    }
    return json({ error: 'all providers failed' }, 502);
  }

  // Non-streaming: buffer fully so we can fall through the whole chain on error.
  let lastError = 'all providers failed';
  for (const provider of chain) {
    for (const model of asArray(provider.models[tier]!)) {
      for (const key of provider.keys) {
        if (Date.now() - chainStartedAt > CHAIN_DEADLINE_MS) {
          return json({ error: `${lastError} (deadline exceeded)` }, 502);
        }
        const { response, clearTimeout: clear } = callUpstream(provider, key, model, upstream);
        try {
          const up = await response;
          if (!up.ok) {
            clear();
            lastError = `${provider.name} ${up.status}`;
            continue;
          }
          // Connected - let the full (non-streamed) generation finish
          // instead of aborting mid-completion.
          clear();
          const data = await up.json();
          const text: string | undefined = data?.choices?.[0]?.message?.content?.trim();
          if (text) return json({ text, provider: provider.name });
          lastError = `${provider.name} empty`;
        } catch (e) {
          clear();
          lastError = e instanceof Error ? e.message : String(e);
        }
      }
    }
  }
  return json({ error: lastError }, 502);
}
