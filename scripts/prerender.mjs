// Prerenders static HTML per route so crawlers that don't execute JS
// (GPTBot, ClaudeBot, PerplexityBot, Googlebot's first pass) see real
// per-page title/description/content/JSON-LD instead of the one generic
// SPA shell every route otherwise shares. Runs as `postbuild`, after
// `vite build` has already produced `dist/`.
//
// Safe because src/main.tsx uses createRoot(...).render(), not
// hydrateRoot - on load, React wipes #root and renders the CSR app fresh,
// so the static markup written here never needs to match the client
// render exactly.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const BLOG_DIR = path.join(ROOT, 'content', 'blog');
const SITE_URL = 'https://dhruv-choudhary.tech';
const AUTHOR = { '@type': 'Person', name: 'Dhruv Choudhary', url: SITE_URL };

const { SEARCH_EXAMPLES } = await import(pathToFileURL(path.join(ROOT, 'src/content/searchExamples.mjs')));
const { IMAGINE_EXAMPLES } = await import(pathToFileURL(path.join(ROOT, 'src/content/imagineExamples.mjs')));

marked.use({ gfm: true, breaks: false });

// ── Frontmatter parsing (mirrors src/lib/blog.ts's coercion rules, in
// plain JS so this plays as a Node script - can't import a .ts module
// without a loader) ──────────────────────────────────────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key) continue;
    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val.slice(1, -1).split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      continue;
    }
    if (val === 'true') { data[key] = true; continue; }
    if (val === 'false') { data[key] = false; continue; }
    data[key] = val.replace(/^["']|["']$/g, '');
  }
  return { data, content: match[2].trimStart() };
}

function loadPublishedPosts() {
  return readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const { data, content } = parseFrontmatter(readFileSync(path.join(BLOG_DIR, f), 'utf-8'));
      return {
        slug: f.replace(/\.md$/, ''),
        title: data.title ?? '',
        date: data.date ?? '',
        excerpt: data.excerpt ?? '',
        tags: data.tags ?? [],
        coverImage: data.coverImage ?? '',
        published: data.published === true,
        content,
      };
    })
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function readingTime(text) {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Shell patching ───────────────────────────────────────────────────────
const SHELL = readFileSync(path.join(DIST, 'index.html'), 'utf-8');

function patchShell({ path: routePath, title, description, ogType = 'website', image, jsonLd, bodyHtml }) {
  const fullTitle = `${title} · Dhruv Choudhary`;
  const canonicalUrl = `${SITE_URL}${routePath}`;
  let html = SHELL;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonicalUrl}$2`);
  html = html.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${ogType}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(fullTitle)}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  if (image) html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${image}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeHtml(fullTitle)}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);

  if (jsonLd) {
    const ldScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n  </head>`;
    html = html.replace(/<\/head>/, ldScript);
  }
  if (bodyHtml !== undefined) {
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  }
  return html;
}

function writeRoute(routePath, html) {
  const dir = path.join(DIST, routePath.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), html);
}

// ── Per-route content ────────────────────────────────────────────────────
const posts = loadPublishedPosts();

const pages = [];

// /blog - list
pages.push({
  path: '/blog',
  title: 'Blog',
  description: 'Writing on AI engineering, RAG systems, and shipping production ML by Dhruv Choudhary.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog',
    url: `${SITE_URL}/blog`,
    description: 'Writing on AI engineering, RAG systems, and shipping production ML by Dhruv Choudhary.',
  },
  bodyHtml: `
    <main>
      <h1>Blog</h1>
      <ul>
        ${posts.map(p => `
        <li>
          <a href="/blog/${p.slug}">${escapeHtml(p.title)}</a>
          <p>${escapeHtml(p.excerpt)}</p>
          <span>${formatDate(p.date)} &middot; ${readingTime(p.content)} min read</span>
        </li>`).join('')}
      </ul>
    </main>`,
});

// /blog/<slug> - one per published post
for (const post of posts) {
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  pages.push({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.excerpt,
    ogType: 'article',
    image: post.coverImage || undefined,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      dateModified: post.date,
      author: AUTHOR,
      image: post.coverImage || undefined,
      mainEntityOfPage: canonicalUrl,
    },
    bodyHtml: `
      <main>
        <article>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${formatDate(post.date)} &middot; ${readingTime(post.content)} min read</p>
          ${post.tags.length ? `<ul>${post.tags.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
          <div class="md-body">${marked.parse(post.content)}</div>
        </article>
      </main>`,
  });
}

// /search - real, always-visible example content (mirrors SearchPage.tsx)
pages.push({
  path: '/search',
  title: 'Search',
  description: 'Ask anything about Dhruv Choudhary\'s projects, experience, and writing.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SEARCH_EXAMPLES.map(ex => ({
      '@type': 'Question',
      name: ex.question,
      acceptedAnswer: { '@type': 'Answer', text: ex.answerSummary },
    })),
  },
  bodyHtml: `
    <main>
      <h1>Ask anything.</h1>
      <p>Agentic search over the web.</p>
      <h2>Example questions</h2>
      ${SEARCH_EXAMPLES.map(ex => `
      <section>
        <h3>${escapeHtml(ex.question)}</h3>
        <p>${escapeHtml(ex.answerSummary)}</p>
      </section>`).join('')}
    </main>`,
});

// /imagine - real, always-visible prompt-idea content (mirrors ImaginePage.tsx)
pages.push({
  path: '/imagine',
  title: 'Imagine',
  description: 'Generate images from a text prompt. Free, in-browser, no sign-up.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Imagine',
    url: `${SITE_URL}/imagine`,
    description: 'Generate images from a text prompt. Free, in-browser, no sign-up.',
  },
  bodyHtml: `
    <main>
      <h1>Imagine.</h1>
      <p>Type anything. It generates an image in the browser, free, no sign-up.</p>
      <h2>Prompt ideas you can try</h2>
      ${IMAGINE_EXAMPLES.map(ex => `
      <section>
        <h3>${escapeHtml(ex.prompt)}</h3>
        <p>${escapeHtml(ex.styleNote)}</p>
      </section>`).join('')}
    </main>`,
});

// /games - meta + light JSON-LD only. GamesPage's own content is already a
// static array visible without interaction, but it's not worth duplicating
// here for a page that isn't a citation/lead-gen target - the meta/JSON-LD
// fix alone (crawler no longer sees the generic homepage title) is the win.
pages.push({
  path: '/games',
  title: 'Arcade',
  description: 'Snake, 2048, Tic-Tac-Toe, and Chess. Four small games, mostly built from scratch.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Arcade',
    url: `${SITE_URL}/games`,
    description: 'Snake, 2048, Tic-Tac-Toe, and Chess. Four small games, mostly built from scratch.',
  },
});

// ── Write ────────────────────────────────────────────────────────────────
let failures = 0;
for (const page of pages) {
  try {
    const html = patchShell(page);
    writeRoute(page.path, html);
  } catch (err) {
    failures++;
    console.error(`prerender failed for ${page.path}:`, err);
  }
}

if (failures > 0) {
  console.error(`prerender: ${failures} route(s) failed`);
  process.exit(1);
}
console.log(`prerender: wrote ${pages.length} static route(s)`);
