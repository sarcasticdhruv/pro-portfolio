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
        // compound first (better search+reasoning); mini has its own separate
        // rate-limit bucket, so it covers compound's low daily cap
        web: ['groq/compound', 'groq/compound-mini'],
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

  const gemini = envKeys('GEMINI_API_KEY', 'GEMINI_API_KEY_2');
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

// Preference order per tier. HF's big models lead the quality-critical tiers;
// the fast free providers (cerebras/groq) backstop them on rate-limit or outage.
const TIER_ORDER: Record<Tier, string[]> = {
  synth: ['huggingface', 'groq', 'cerebras', 'gemini'],
  fast: ['huggingface', 'cerebras', 'groq', 'gemini'],
  // Chat leads with Groq: its LPU hardware and non-reasoning llama model
  // start emitting real content immediately, unlike gpt-oss-120b's hidden
  // "thinking" tokens on HF, which stalls streaming even though it's live.
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

function callUpstream(provider: Provider, key: string, model: string, body: UpstreamBody): Promise<Response> {
  return fetch(provider.url, {
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
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: { tier?: Tier; messages?: unknown; maxTokens?: number; temperature?: number; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const tier = body.tier;
  const messages = body.messages;
  if (!tier || !Array.isArray(messages)) return json({ error: 'missing tier or messages' }, 400);

  const chain = chainFor(tier);
  if (!chain.length) return json({ error: `no provider configured for tier ${tier}` }, 503);

  const wantStream = body.stream !== false; // default to streaming
  const upstream: UpstreamBody = {
    messages,
    maxTokens: body.maxTokens,
    temperature: body.temperature,
    stream: wantStream,
  };

  if (wantStream) {
    // Pick the first provider/key that returns a 200 stream and pipe its SSE
    // through untouched (all providers are OpenAI-compatible, so the browser
    // parser is identical regardless of which one answered).
    for (const provider of chain) {
      for (const model of asArray(provider.models[tier]!)) {
        for (const key of provider.keys) {
          try {
            const up = await callUpstream(provider, key, model, upstream);
            if (up.ok && up.body) {
              return new Response(up.body, {
                headers: {
                  'Content-Type': 'text/event-stream; charset=utf-8',
                  'Cache-Control': 'no-cache, no-transform',
                  'X-Accel-Buffering': 'no',
                  'X-LLM-Provider': provider.name,
                },
              });
            }
          } catch {
            // network error - try the next key/model/provider
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
        try {
          const up = await callUpstream(provider, key, model, upstream);
          if (!up.ok) {
            lastError = `${provider.name} ${up.status}`;
            continue;
          }
          const data = await up.json();
          const text: string | undefined = data?.choices?.[0]?.message?.content?.trim();
          if (text) return json({ text, provider: provider.name });
          lastError = `${provider.name} empty`;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
      }
    }
  }
  return json({ error: lastError }, 502);
}
