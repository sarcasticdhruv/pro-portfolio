// Thin client for the server-side LLM proxy (/api/llm). Provider keys and
// model selection now live in the Vercel Edge Function, not the browser, so
// nothing sensitive ships in the bundle. This module just forwards a tier +
// messages and parses the streamed (or buffered) OpenAI-style response.
//
// The exported surface (streamChat / chat / hasAnyProvider / hasWebSearch and
// the types) is unchanged, so searchAgent.ts and other callers are untouched.

// A user message's content is normally a plain string. When the chatbot has
// an image attached, it becomes an OpenAI-vision-style part array instead -
// only Gemini among our providers understands this shape, so callers must
// pair it with `provider: 'gemini'`.
export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

export type ModelTier = 'fast' | 'synth' | 'web' | 'chat';

// Forces a single named provider instead of the tier's default fallback
// chain - powers the search page's Photon/Core/Pro model toggle, and the
// chatbot's image-attachment flow (only Gemini here handles vision input).
export type ProviderOverride = 'groq' | 'cerebras' | 'huggingface' | 'gemini';

export interface StreamOptions {
  messages: ChatMessage[];
  tier: ModelTier;
  maxTokens?: number;
  temperature?: number;
  provider?: ProviderOverride;
  onToken?: (text: string) => void;
  // Fired when the request starts so the UI can reset any partial output.
  onAttempt?: () => void;
}

export interface StreamResult {
  text: string;
}

const ENDPOINT = '/api/llm';

// The proxy owns which providers/keys are configured, so the client can't know
// for certain. Stay optimistic and always attempt: the proxy fails cleanly and
// callers already degrade gracefully when a synth call throws.
export function hasAnyProvider(): boolean {
  return true;
}

export function hasWebSearch(): boolean {
  return true;
}

async function proxyError(res: Response): Promise<never> {
  const err = await res.json().catch(() => ({} as { error?: string }));
  throw new Error(err?.error ?? `search error ${res.status}`);
}

// Streamed call. The proxy has already picked a working provider before it
// starts streaming, so there is a single clean stream (no mid-answer retry).
export async function streamChat(opts: StreamOptions): Promise<StreamResult> {
  opts.onAttempt?.();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier: opts.tier,
      messages: opts.messages,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      provider: opts.provider,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) await proxyError(res);

  const reader = res.body!.getReader();
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
        const chunk = JSON.parse(payload);
        const delta: string = chunk?.choices?.[0]?.delta?.content ?? '';
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

// Non-streamed convenience for worker agents and one-shot chat calls.
export async function chat(opts: Omit<StreamOptions, 'onToken' | 'onAttempt'>): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier: opts.tier,
      messages: opts.messages,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      provider: opts.provider,
      stream: false,
    }),
  });

  if (!res.ok) await proxyError(res);

  const data = await res.json();
  const text: string = data?.text ?? '';
  if (!text.trim()) throw new Error('empty answer');
  return text;
}
