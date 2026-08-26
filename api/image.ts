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

// HF pulled FLUX.1-schnell off the hf-inference provider on 2026-07-15/16 -
// every key was failing identically against a now-dead model, not a rotation
// bug. stable-diffusion-3-medium is HF's own current hf-inference example for
// text-to-image (https://huggingface.co/docs/inference-providers/en/providers/hf-inference).
const HF_MODEL = 'stabilityai/stable-diffusion-3-medium-diffusers';
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

// Vercel Edge Functions must START a response within 25s or the whole
// invocation dies with EDGE_FUNCTION_INVOCATION_TIMEOUT - and an aborted
// function never reaches the Pollinations fallback below, since it's dead
// before that code even runs. SD3 is a diffusion model, not Groq's LPU-
// accelerated text models, so a cold or loaded backend can genuinely take
// longer than that. HF_ATTEMPT_TIMEOUT_MS bounds each individual key's
// attempt; HF_TOTAL_TIMEOUT_MS caps the whole multi-key loop (up to 4 keys
// configured, see .env.example) well under the 25s ceiling, leaving real
// headroom for the Pollinations attempt afterward - 4 sequential 12s
// timeouts alone would already exceed Vercel's limit before Pollinations
// ever got a turn.
const HF_ATTEMPT_TIMEOUT_MS = 8000;
const HF_TOTAL_TIMEOUT_MS = 15000;

async function fromHuggingFace(prompt: string): Promise<Response | null> {
  const loopDeadline = Date.now() + HF_TOTAL_TIMEOUT_MS;
  for (const key of hfKeys()) {
    if (Date.now() >= loopDeadline) break;
    const keyLabel = `...${key.slice(-4)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HF_ATTEMPT_TIMEOUT_MS);
    try {
      const r = await fetch(HF_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'image/png',
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: controller.signal,
      });
      clearTimeout(timer);
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
      // Not ok, or ok but not an image (HF returns JSON error bodies with a
      // 200 in some cases) - log why so a future outage shows up in Vercel's
      // function logs instead of silently falling back to Pollinations.
      const bodyText = await r.text().catch(() => '');
      console.error(`hf-inference key ${keyLabel} failed: ${r.status} ${type} ${bodyText.slice(0, 300)}`);
    } catch (err) {
      clearTimeout(timer);
      console.error(`hf-inference key ${keyLabel} threw:`, err);
    }
  }
  return null;
}

// Same reasoning as the HF timeouts above: HF_TOTAL_TIMEOUT_MS (15s) plus
// this leaves ~2s of margin under Vercel's 25s response deadline, so a slow
// Pollinations response still fails cleanly into the final "image
// generation failed" error instead of silently taking the whole request
// past Vercel's own timeout.
const POLLINATIONS_TIMEOUT_MS = 8000;

async function fromPollinations(prompt: string, width: number, height: number): Promise<Response | null> {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLLINATIONS_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
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
    clearTimeout(timer);
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
