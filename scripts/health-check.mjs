// Live health check for the AI backends behind /search and /imagine.
//
//   npm run health                 -> end-to-end: every LLM tier + one image
//   npm run health -- --deep       -> also pin each LLM provider and each image
//                                     provider individually (uses a little
//                                     free quota per provider)
//   npm run health -- --base=http://localhost:3000
//
// Exit code 1 only when a user-facing feature is actually down (a tier has no
// working provider, or no image provider works). A single dead provider is a
// warning: the proxy falls back, but you want to know it ran out of credits.
const BASE = (process.argv.find(a => a.startsWith('--base='))?.slice(7) ?? 'https://dhruv-choudhary.tech').replace(/\/$/, '');
const DEEP = process.argv.includes('--deep');

const failures = [];
const warnings = [];
const rows = [];

async function llm(body, timeoutMs = 45000) {
  const t = Date.now();
  try {
    const res = await fetch(`${BASE}/api/llm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        stream: false,
        maxTokens: 600, // reasoning models spend tokens thinking; too low = empty answer
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        ...body,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && !!data.text, provider: data.provider, error: data.error ?? `HTTP ${res.status}`, ms: Date.now() - t, data };
  } catch (e) {
    return { ok: false, error: e.name === 'TimeoutError' ? 'timeout' : String(e.message), ms: Date.now() - t };
  }
}

async function image(provider) {
  const t = Date.now();
  try {
    const res = await fetch(`${BASE}/api/image`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'a blue sky with white clouds', ...(provider ? { provider } : {}) }),
      signal: AbortSignal.timeout(30000),
    });
    const type = res.headers.get('content-type') ?? '';
    const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
    return {
      ok: res.ok && type.startsWith('image') && bytes > 5000,
      provider: res.headers.get('x-image-source'),
      error: res.ok ? `bad payload (${type}, ${bytes}B)` : `HTTP ${res.status}`,
      ms: Date.now() - t,
    };
  } catch (e) {
    return { ok: false, error: e.name === 'TimeoutError' ? 'timeout' : String(e.message), ms: Date.now() - t };
  }
}

const mark = r => (r.ok ? 'PASS' : 'FAIL');
function record(name, r, extra = '') {
  rows.push(`  ${mark(r)}  ${name.padEnd(34)} ${String(r.provider ?? '-').padEnd(16)} ${(r.ms / 1000).toFixed(1)}s  ${r.ok ? extra : r.error}`);
}

// 1. every tier end to end (this is what visitors hit)
for (const tier of ['fast', 'synth', 'chat', 'web']) {
  const messages = tier === 'web'
    ? [{ role: 'user', content: 'What is the latest stable Node.js version? One sentence.' }]
    : undefined;
  const r = await llm({ tier, ...(messages ? { messages } : {}) });
  record(`llm tier: ${tier}`, r, tier === 'web' ? `${r.data?.sources?.length ?? 0} sources` : '');
  if (!r.ok) failures.push(`LLM tier "${tier}" is down: ${r.error}`);
  else if (tier === 'web' && !(r.data?.sources?.length > 0)) warnings.push('web tier answered but returned no cited sources');
}

// 2. image generation end to end
const img = await image();
record('image: full chain', img);
if (!img.ok) failures.push(`Image generation is down: ${img.error}`);

// 3. per-provider (deep): find which one ran out of credits
if (DEEP) {
  for (const provider of ['groq', 'nvidia', 'gemini', 'cohere', 'cerebras', 'huggingface']) {
    const r = await llm({ tier: 'synth', provider, strict: true });
    record(`llm provider: ${provider}`, r);
    if (!r.ok) warnings.push(`LLM provider "${provider}" failed: ${r.error}${/402|payment|credit/i.test(r.error) ? ' (out of credits?)' : ''}`);
  }
  for (const provider of ['cloudflare', 'nvidia', 'huggingface', 'pollinations']) {
    const r = await image(provider);
    record(`image provider: ${provider}`, r);
    if (!r.ok) warnings.push(`Image provider "${provider}" failed: ${r.error}`);
  }
}

console.log(`Health check against ${BASE}${DEEP ? ' (deep)' : ''}\n`);
console.log(rows.join('\n'));
if (warnings.length) { console.log(''); for (const w of warnings) console.log(`  warn  ${w}`); }
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  FAIL  ${f}`);
  process.exit(1);
}
console.log('\nAll user-facing features healthy.');
