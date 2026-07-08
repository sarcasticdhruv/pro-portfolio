// Direct browser -> Groq calls for the chatbot widget ONLY, bypassing the
// /api/llm and /api/transcribe proxy hops entirely for the lowest possible
// latency.
//
// This is a deliberate, informed exception to the "keys never touch the
// browser" rule the rest of this codebase follows (search, exports, image
// gen all stay behind the server-side proxy). VITE_GROQ_CHAT_KEY ships
// inside the shipped JS bundle and anyone can read it via devtools. The
// blast radius is scoped on purpose: this is a separate, dedicated Groq key
// from the ones the proxy uses for search/synth/web, so if it leaks or gets
// abused, only the chatbot's own quota is at risk.
//
// If the key isn't configured (or the direct call fails), this falls back
// to the secure proxy so the chatbot still works, just with one extra hop.
import { streamChat, type ChatMessage } from './providers';

const GROQ_KEY = import.meta.env.VITE_GROQ_CHAT_KEY as string | undefined;
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Groq's LPU hardware - fastest inference available
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

export function hasDirectChat(): boolean {
  return !!GROQ_KEY;
}

export interface ChatbotStreamOptions {
  maxTokens?: number;
  temperature?: number;
  onToken?: (delta: string) => void;
  // True when the latest user message carries an image part. Groq's direct
  // fast path is a text-only model, so this skips it and routes through the
  // secure proxy to Gemini instead - the only provider here that understands
  // vision input.
  hasImage?: boolean;
}

export async function streamChatbot(messages: ChatMessage[], opts: ChatbotStreamOptions = {}): Promise<string> {
  if (GROQ_KEY && !opts.hasImage) {
    try {
      return await streamGroqDirect(messages, opts);
    } catch {
      // Direct call failed (rate limit, network, revoked key) - fall through
      // to the proxy rather than surface an error the user can't act on.
    }
  }
  const res = await streamChat({
    tier: 'chat',
    provider: opts.hasImage ? 'gemini' : undefined,
    messages,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    onToken: opts.onToken,
  });
  return res.text;
}

async function streamGroqDirect(messages: ChatMessage[], opts: ChatbotStreamOptions): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.72,
      stream: true,
      messages,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`groq direct ${res.status}`);

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
        const chunk = JSON.parse(payload);
        const delta: string = chunk?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          opts.onToken?.(delta);
        }
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }

  if (!full.trim()) throw new Error('empty answer');
  return full;
}

// Same direct-call shortcut, applied to the dictate mic: posting straight to
// Groq's Whisper endpoint skips the browser -> our edge function -> Groq hop
// (plus that edge function's own cold start), which is most of the perceived
// delay for a short clip - the transcription model itself is unchanged
// (still whisper-large-v3-turbo), so quality is identical either way.
export async function transcribeAudio(blob: Blob): Promise<string> {
  if (GROQ_KEY) {
    try {
      return await transcribeGroqDirect(blob);
    } catch {
      // Direct call failed (rate limit, network, revoked key) - fall through
      // to the proxy rather than surface an error the user can't act on.
    }
  }
  const form = new FormData();
  form.append('audio', blob, 'audio.webm');
  const res = await fetch('/api/transcribe', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({} as { text?: string; error?: string }));
  if (!data.text) throw new Error(data.error ?? 'Could not transcribe audio.');
  return data.text;
}

async function transcribeGroqDirect(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  form.append('model', WHISPER_MODEL);
  form.append('response_format', 'json');

  const res = await fetch(GROQ_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`groq direct ${res.status}`);

  const data = await res.json();
  const text: string | undefined = data?.text?.trim();
  if (!text) throw new Error('empty transcript');
  return text;
}
