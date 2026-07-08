// Vercel Edge Function: speech-to-text via Groq's free Whisper API.
//
// Receives a recorded audio blob (multipart/form-data, field "audio") from
// the chatbot's mic button, forwards it to Groq's OpenAI-compatible Whisper
// endpoint, and returns the transcript. Reuses the same GROQ_API_KEY pool as
// /api/llm, tried in order so an exhausted/invalid key falls through to the
// next instead of failing outright.

export const config = { runtime: 'edge' };

const ENV: Record<string, string | undefined> =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) ?? {};

function groqKeys(): string[] {
  return ['GROQ_API_KEY', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_SEARCH_API_KEY']
    .map(n => ENV[n])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim());
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// turbo trades a little accuracy for much lower latency - the right call for
// a chat mic button where the visitor is waiting on the transcript to appear.
const MODEL = 'whisper-large-v3-turbo';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const keys = groqKeys();
  if (!keys.length) return json({ error: 'transcription not configured' }, 503);

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return json({ error: 'invalid form data' }, 400);
  }

  const audio = incoming.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) return json({ error: 'missing audio' }, 400);

  let lastError = 'transcription failed';
  for (const key of keys) {
    try {
      const upstream = new FormData();
      upstream.append('file', audio, 'audio.webm');
      upstream.append('model', MODEL);
      upstream.append('response_format', 'json');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: upstream,
      });
      if (!res.ok) {
        lastError = `groq ${res.status}`;
        continue;
      }
      const data = await res.json();
      const text: string | undefined = data?.text?.trim();
      if (text) return json({ text });
      lastError = 'empty transcript';
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return json({ error: lastError }, 502);
}
