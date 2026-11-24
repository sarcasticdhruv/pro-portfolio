// SEO health check ("maintenance run") for every published blog post.
//
//   npm run seo:check                  -> checks the live site
//   npm run seo:check -- --base=http://localhost:4173   -> checks a local preview
//
// Verifies, per post: URL returns 200, is in the sitemap, canonical points at
// itself, robots allows indexing, title/description/H1 present, real article
// text is in the raw HTML (what non-JS crawlers see), JSON-LD parses, and the
// cover image resolves. Also checks robots.txt, sitemap parity with
// content/blog, and the www/http redirects. Exits 1 on any failure so it can
// run in CI on a schedule.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BLOG_DIR = path.join(ROOT, 'content', 'blog');
const baseArg = process.argv.find(a => a.startsWith('--base='));
const BASE = (baseArg ? baseArg.slice(7) : 'https://dhruv-choudhary.tech').replace(/\/$/, '');
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };

function frontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  if (!m) return data;
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return data;
}

const posts = readdirSync(BLOG_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => ({ slug: f.replace(/\.md$/, ''), ...frontmatter(readFileSync(path.join(BLOG_DIR, f), 'utf-8')) }))
  .filter(p => p.published === 'true');

const problems = [];
const warn = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

async function get(url, opts = {}) {
  return fetch(url, { headers: UA, redirect: 'follow', ...opts });
}

// ── site-level ───────────────────────────────────────────────────────────
const robots = await (await get(`${BASE}/robots.txt`)).text();
if (/^\s*Disallow:\s*\/\s*$/mi.test(robots)) fail('robots.txt', 'disallows the whole site');
if (!/Sitemap:/i.test(robots)) fail('robots.txt', 'missing Sitemap: line');

const sitemapRes = await get(`${BASE}/sitemap.xml`);
const sitemap = await sitemapRes.text();
if (!sitemapRes.ok) fail('sitemap.xml', `HTTP ${sitemapRes.status}`);
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
const canonicalBase = 'https://dhruv-choudhary.tech';

if (BASE === canonicalBase) {
  for (const u of ['https://www.dhruv-choudhary.tech/', 'http://dhruv-choudhary.tech/']) {
    try {
      const r = await fetch(u, { redirect: 'manual' });
      const loc = r.headers.get('location') ?? '';
      if (![301, 308].includes(r.status) || !loc.startsWith(canonicalBase)) {
        warn.push(`${u} -> ${r.status} ${loc} (expected permanent redirect to canonical host)`);
      }
    } catch (e) {
      warn.push(`${u} unreachable: ${e.cause?.code ?? e.message} (fix: add the www domain in Vercel so it gets a cert and redirects)`);
    }
  }
}

// ── per post ─────────────────────────────────────────────────────────────
function pick(html, re) { const m = html.match(re); return m ? m[1] : ''; }

async function checkPost(p) {
  const where = `/blog/${p.slug}`;
  const url = `${BASE}${where}`;
  const res = await get(url);
  if (res.status !== 200) return fail(where, `HTTP ${res.status}`);
  const html = await res.text();

  if (!sitemapUrls.has(`${canonicalBase}${where}`)) fail(where, 'missing from sitemap.xml');
  const canonical = pick(html, /<link rel="canonical" href="([^"]*)"/);
  if (canonical !== `${canonicalBase}${where}`) fail(where, `canonical is "${canonical}"`);
  const robotsMeta = pick(html, /<meta name="robots" content="([^"]*)"/);
  if (/noindex/i.test(robotsMeta) || /noindex/i.test(res.headers.get('x-robots-tag') ?? '')) fail(where, 'noindex present');

  const title = pick(html, /<title>([^<]*)<\/title>/);
  if (!title.includes(p.title.slice(0, 30).replace(/&/g, '&amp;').replace(/'/g, "'"))) {
    // title may be HTML-escaped; compare loosely on a short prefix
    if (!title.toLowerCase().includes(p.title.slice(0, 20).toLowerCase())) fail(where, `title mismatch: "${title}"`);
  }
  if (title.length > 70) warn.push(`${where}: title is ${title.length} chars (Google truncates ~60)`);
  const desc = pick(html, /<meta name="description" content="([^"]*)"/);
  if (desc.length < 50) fail(where, 'meta description missing/too short');
  if (desc.length > 320) warn.push(`${where}: meta description ${desc.length} chars`);
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) fail(where, 'expected exactly one <h1> in raw HTML');

  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 250) fail(where, `only ${words} words in raw HTML (content not prerendered?)`);

  for (const block of html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(block[1]); } catch { fail(where, 'invalid JSON-LD'); }
  }
  if (!/BlogPosting/.test(html)) fail(where, 'BlogPosting JSON-LD missing');

  if (p.coverImage) {
    const img = p.coverImage.startsWith('http') ? p.coverImage : `${canonicalBase}${p.coverImage}`;
    try {
      let r = await fetch(img, { method: 'HEAD', headers: UA });
      if (r.status === 405 || r.status === 403) r = await fetch(img, { headers: UA });
      if (!r.ok) warn.push(`${where}: cover image ${r.status} (${img})`);
    } catch (e) { warn.push(`${where}: cover image unreachable (${img})`); }
  }
}

// small concurrency pool
const queue = [...posts];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) await checkPost(queue.shift()).catch(e => fail('error', String(e)));
}));

// sitemap should not contain posts that are unpublished/removed
for (const u of sitemapUrls) {
  const m = u.match(/\/blog\/([^/]+)$/);
  if (m && !['tag'].includes(m[1]) && !posts.some(p => p.slug === m[1])) fail('sitemap.xml', `lists non-published post ${u}`);
}

console.log(`Checked ${posts.length} published posts against ${BASE}`);
for (const w of warn) console.log(`  warn  ${w}`);
if (problems.length) {
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log('All SEO checks passed.');
