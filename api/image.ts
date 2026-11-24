// Vercel Edge Function: server-side image generation.
//
// Tries Cloudflare FLUX, then NVIDIA FLUX, then Hugging Face, then
// Pollinations (keyless) so a result is almost always returned. Supports GET (so the browser can point an <img> straight at
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

// Cloudflare Workers AI (free daily allowance, no card): FLUX.1-schnell
// returns JSON { result: { image: <base64 jpeg> } }. Tried first because it is
// the most reliable free option; HF and Pollinations are credit/quota-limited.
const CF_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const CF_TIMEOUT_MS = 12000;

async function fromCloudflare(prompt: string, budgetMs: number): Promise<Response | null> {
  const account = ENV.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = ENV.CLOUDFLARE_API_TOKEN?.trim();
  if (!account || !token) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(CF_TIMEOUT_MS, budgetMs));
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 4 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      console.error(`cloudflare workers-ai failed: ${r.status} ${(await r.text().catch(() => '')).slice(0, 300)}`);
      return null;
    }
    const data = await r.json();
    const b64: string | undefined = data?.result?.image;
    if (!b64) { console.error('cloudflare workers-ai: no image in response'); return null; }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Image-Source': 'cloudflare-flux',
      },
    });
  } catch (err) {
    clearTimeout(timer);
    console.error('cloudflare workers-ai threw:', err);
    return null;
  }
}

// NVIDIA NIM FLUX.1-schnell (free developer credits). ~9s, so it sits behind
// Cloudflare (~2s) but ahead of the credit-limited HF and quota-limited
// Pollinations. Returns { artifacts: [{ base64 }] }.
const NVIDIA_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell';
const NVIDIA_TIMEOUT_MS = 14000;

// NVIDIA only accepts these exact dimensions.
const NVIDIA_DIMS = [768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280, 1344];
const snapDim = (v: number) => NVIDIA_DIMS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

async function fromNvidia(prompt: string, width: number, height: number, budgetMs: number): Promise<Response | null> {
  const key = ENV.NVIDIA_API_KEY?.trim();
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(NVIDIA_TIMEOUT_MS, budgetMs));
  try {
    const r = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ prompt, width: snapDim(width), height: snapDim(height), steps: 4 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      console.error(`nvidia flux failed: ${r.status} ${(await r.text().catch(() => '')).slice(0, 300)}`);
      return null;
    }
    const data = await r.json();
    const b64: string | undefined = data?.artifacts?.[0]?.base64;
    if (!b64) { console.error('nvidia flux: no image in response'); return null; }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'X-Image-Source': 'nvidia-flux' },
    });
  } catch (err) {
    clearTimeout(timer);
    console.error('nvidia flux threw:', err);
    return null;
  }
}

async function fromHuggingFace(prompt: string, budgetMs: number): Promise<Response | null> {
  const loopDeadline = Date.now() + Math.min(HF_TOTAL_TIMEOUT_MS, budgetMs);
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
      // 401/402 = bad key / no credits: the key is dead for every request, so
      // skip straight to the next key instead of waiting on a timeout.
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

async function fromPollinations(prompt: string, width: number, height: number, budgetMs: number): Promise<Response | null> {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&seed=${seed}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(POLLINATIONS_TIMEOUT_MS, budgetMs));
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
  // Number(null) is 0, which used to clamp to 256 - every request that did
  // not pass an explicit size silently got a 256px image from Pollinations.
  if (v == null || v.trim() === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1024, Math.max(256, Math.round(n)));
}

export default async function handler(req: Request): Promise<Response> {
  let prompt = '';
  let forced = '';
  let width = 1024;
  let height = 1024;

  if (req.method === 'GET') {
    const u = new URL(req.url);
    prompt = (u.searchParams.get('prompt') ?? '').trim();
    forced = u.searchParams.get('provider') ?? '';
    width = clampDim(u.searchParams.get('width'), 1024);
    height = clampDim(u.searchParams.get('height'), 1024);
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      prompt = String(body?.prompt ?? '').trim();
      forced = typeof body?.provider === 'string' ? body.provider : '';
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

  // Providers run in order of reliability, sharing one wall-clock budget so
  // the whole chain stays under Vercel's 25s Edge response deadline. A
  // provider is skipped (not started) when too little budget remains.
  const startedAt = Date.now();
  const BUDGET_MS = 22000;
  const left = () => BUDGET_MS - (Date.now() - startedAt);
  const only = forced; // health checks can pin a single provider
  const run = <T,>(name: string, minMs: number, fn: (budget: number) => Promise<T | null>) =>
    (only && only !== name) || left() < minMs ? Promise.resolve(null) : fn(left());

  const out =
    (await run('cloudflare', 3000, b => fromCloudflare(prompt, b))) ??
    (await run('nvidia', 6000, b => fromNvidia(prompt, width, height, b))) ??
    (await run('huggingface', 4000, b => fromHuggingFace(prompt, b))) ??
    (await run('pollinations', 4000, b => fromPollinations(prompt, width, height, b)));
  if (out) return out;

  return json({ error: 'image generation failed' }, 502);
}
