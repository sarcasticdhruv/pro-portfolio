// Provider pool for the search page. All endpoints are OpenAI-compatible
// chat completions called straight from the browser (this site has no
// backend). Groq works out of the box with the existing key; Cerebras,
// Gemini and OpenRouter join the pool when their keys exist in .env.
// Each call declares a tier and we try providers in that tier's preference
// order, falling through on failure or 429.
//
// Tiers:
//   fast  - small/fast model for worker agents (drafting, analysis)
//   synth - strongest model for the final synthesized answer
//   web   - model with real built-in web search (Groq compound-mini only)

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ModelTier = 'fast' | 'synth' | 'web';

export interface StreamOptions {
  messages: ChatMessage[];
  tier: ModelTier;
  maxTokens?: number;
  temperature?: number;
  onToken?: (text: string) => void;
  // Fired when a (re)attempt starts so the UI can reset partial output
  onAttempt?: () => void;
}

export interface StreamResult {
  text: string;
}

interface Provider {
  name: string;
  url: string;
  // Multiple keys per provider = quota rotation: on failure with key 1 we
  // retry the same provider with key 2 before falling to the next provider.
  keys: string[];
  // Missing tier = provider skipped for that tier. An array means try the
  // models in order (e.g. compound -> compound-mini when rate-limited).
  models: Partial<Record<ModelTier, string | string[]>>;
  extraHeaders?: Record<string, string>;
}

const env = (import.meta as any).env ?? {};

// Collect a provider's keys: dedicated search key first, then the main key,
// then any `_`-suffixed spares. Empty placeholders are dropped.
function keysFor(...names: string[]): string[] {
  return names.map(n => env[n]).filter((k): k is string => !!k && k.trim().length > 0);
}

function buildPool(): Provider[] {
  const pool: Provider[] = [];
  const groqKeys = keysFor('VITE_GROQ_SEARCH_API_KEY', 'VITE_GROQ_API_KEY', 'VITE_GROQ_API_KEY_');
  if (groqKeys.length > 0) {
    pool.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      keys: groqKeys,
      models: {
        fast: 'llama-3.1-8b-instant',
        synth: 'llama-3.3-70b-versatile',
        // Full compound first (better search + reasoning); mini has its own
        // separate rate-limit bucket, so it covers compound's low daily cap
        web: ['groq/compound', 'groq/compound-mini'],
      },
    });
  }
  const cerebrasKeys = keysFor('VITE_CEREBRAS_API_KEY', 'VITE_CEREBRAS_API_KEY_');
  if (cerebrasKeys.length > 0) {
    pool.push({
      name: 'cerebras',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      keys: cerebrasKeys,
      models: { fast: 'gemma-4-31b', synth: 'gpt-oss-120b' },
    });
  }
  const geminiKeys = keysFor('VITE_GEMINI_API_KEY', 'VITE_GEMINI_API_KEY_');
  if (geminiKeys.length > 0) {
    pool.push({
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      keys: geminiKeys,
      models: { fast: 'gemini-2.5-flash-lite', synth: 'gemini-2.5-flash' },
    });
  }
  const openrouterKeys = keysFor('VITE_OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY_');
  if (openrouterKeys.length > 0) {
    pool.push({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      keys: openrouterKeys,
      models: {
        fast: 'meta-llama/llama-3.3-70b-instruct:free',
        synth: 'meta-llama/llama-3.3-70b-instruct:free',
      },
      extraHeaders: { 'X-Title': 'Dhruv Portfolio Search' },
    });
  }
  return pool;
}

const POOL: Provider[] = buildPool();

// Preference order per tier. Worker agents lean on the fastest/cheapest
// providers first so the strongest quota is saved for synthesis.
const TIER_ORDER: Record<ModelTier, string[]> = {
  fast: ['cerebras', 'gemini', 'groq', 'openrouter'],
  synth: ['groq', 'cerebras', 'gemini', 'openrouter'],
  web: ['groq'],
};

function chainFor(tier: ModelTier): Provider[] {
  const order = TIER_ORDER[tier];
  return order
    .map(name => POOL.find(p => p.name === name))
    .filter((p): p is Provider => !!p && !!p.models[tier]);
}

export function hasAnyProvider(): boolean {
  return POOL.length > 0;
}

export function hasWebSearch(): boolean {
  return chainFor('web').length > 0;
}

async function streamFrom(provider: Provider, key: string, model: string, opts: StreamOptions): Promise<StreamResult> {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...provider.extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 900,
      temperature: opts.temperature ?? 0.4,
      stream: true,
      messages: opts.messages,
    }),
  });

  if (!res.ok || !res.body) {
    const errData = await res.json().catch(() => ({} as any));
    const msg = errData?.error?.message ?? `upstream error ${res.status}`;
    throw new Error(msg);
  }

  // Parse the SSE stream: lines of `data: {json}` ending with `data: [DONE]`
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta: string = json?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          opts.onToken?.(delta);
        }
      } catch {
        // Ignore malformed keep-alive chunks
      }
    }
  }

  if (!full.trim()) throw new Error('empty answer');
  return { text: full };
}

// Streamed call with automatic fallback through the tier's provider chain.
export async function streamChat(opts: StreamOptions): Promise<StreamResult> {
  const chain = chainFor(opts.tier);
  if (chain.length === 0) {
    throw new Error(
      opts.tier === 'web' ? 'no web-capable provider' : 'no AI provider configured',
    );
  }
  let lastError: Error | null = null;
  for (const provider of chain) {
    const models = provider.models[opts.tier]!;
    for (const model of Array.isArray(models) ? models : [models]) {
      for (const key of provider.keys) {
        try {
          opts.onAttempt?.();
          return await streamFrom(provider, key, model, opts);
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          // Fall through: next key, then next model, then next provider
        }
      }
    }
  }
  throw lastError ?? new Error('all providers failed');
}

// Non-streamed convenience for worker agents.
export async function chat(
  opts: Omit<StreamOptions, 'onToken' | 'onAttempt'>,
): Promise<string> {
  const res = await streamChat(opts);
  return res.text;
}
