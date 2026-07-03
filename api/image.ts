// Vercel Edge Function: server-side image generation.
//
// Tries Hugging Face FLUX first (using the secret HF tokens, best quality),
// then falls back to Pollinations (keyless, reliable) so a result is almost
// always returned. Supports GET (so the browser can point an <img> straight at
// /api/image?prompt=...) and POST { prompt }.
//
// The HF tokens never reach the browser - same reason the LLM proxy exists.

export const config = { runtime: 'edge' };

const ENV: Record<string, string | undefined> =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) ?? {};

function hfKeys(): string[] {
  return ['HF_API_KEY', 'HF_API_KEY_2', 'HF_API_KEY_3', 'HF_API_KEY_4']
    .map(n => ENV[n])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim());
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// Fast, high-quality open model that is served on HF's own inference provider.
const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

async function fromHuggingFace(prompt: string): Promise<Response | null> {
  for (const key of hfKeys()) {
    try {
      const r = await fetch(HF_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'image/png',
        },
        body: JSON.stringify({ inputs: prompt }),
      });
      const type = r.headers.get('content-type') ?? '';
      if (r.ok && r.body && type.startsWith('image')) {
        return new Response(r.body, {
          headers: {
            'Content-Type': type,
            'Cache-Control': 'public, max-age=86400',
            'X-Image-Source': 'hf-flux',
          },
        });
      }
    } catch {
      // try the next token, then fall through to Pollinations
    }
  }
  return null;
}

async function fromPollinations(prompt: string, width: number, height: number): Promise<Response | null> {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  try {
    const r = await fetch(url);
    if (r.ok && r.body) {
      return new Response(r.body, {
        headers: {
          'Content-Type': r.headers.get('content-type') ?? 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'X-Image-Source': 'pollinations',
        },
      });
    }
  } catch {
    // give up below
  }
  return null;
}

function clampDim(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1024, Math.max(256, Math.round(n)));
}

export default async function handler(req: Request): Promise<Response> {
  let prompt = '';
  let width = 1024;
  let height = 1024;

  if (req.method === 'GET') {
    const u = new URL(req.url);
    prompt = (u.searchParams.get('prompt') ?? '').trim();
    width = clampDim(u.searchParams.get('width'), 1024);
    height = clampDim(u.searchParams.get('height'), 1024);
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      prompt = String(body?.prompt ?? '').trim();
      width = clampDim(body?.width != null ? String(body.width) : null, 1024);
      height = clampDim(body?.height != null ? String(body.height) : null, 1024);
    } catch {
      return json({ error: 'invalid json' }, 400);
    }
  } else {
    return json({ error: 'method not allowed' }, 405);
  }

  if (!prompt) return json({ error: 'missing prompt' }, 400);
  if (prompt.length > 800) prompt = prompt.slice(0, 800);

  const hf = await fromHuggingFace(prompt);
  if (hf) return hf;

  const poll = await fromPollinations(prompt, width, height);
  if (poll) return poll;

  return json({ error: 'image generation failed' }, 502);
}
