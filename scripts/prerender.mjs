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
const SAME_AS = [
  'https://github.com/sarcasticdhruv',
  'https://linkedin.com/in/dhruv-choudhary-india',
  'https://twitter.com/SarcasticDhruv',
];
const AUTHOR = { '@type': 'Person', name: 'Dhruv Choudhary', url: SITE_URL, jobTitle: 'AI Engineer', sameAs: SAME_AS };

// Cover images can be a site-root-relative path (e.g. generated art saved to
// public/blog/) or a full external URL (e.g. Unsplash). og:image and JSON-LD
// image both require a fully-qualified URL - a bare "/blog/x.webp" is invalid
// per the Open Graph spec and silently fails to unfurl on LinkedIn/Twitter.
function absoluteUrl(url) {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`;
}

const { SEARCH_EXAMPLES } = await import(pathToFileURL(path.join(ROOT, 'src/content/searchExamples.mjs')));
const { IMAGINE_EXAMPLES } = await import(pathToFileURL(path.join(ROOT, 'src/content/imagineExamples.mjs')));
const { getRelatedPosts } = await import(pathToFileURL(path.join(ROOT, 'src/lib/relatedPosts.mjs')));
const { extractFaqPairs } = await import(pathToFileURL(path.join(ROOT, 'src/lib/extractFaq.mjs')));

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

// Static mirror of src/components/blog/AuthorBio.tsx - same facts.
function authorBioHtml() {
  return `
    <div>
      <p>Written by Dhruv Choudhary, AI Engineer</p>
      <p>AI Engineer at AI LifeBOT, where I build GenAI systems that ship to production,
      not just notebooks and demos. Shipping RAG pipelines and agentic systems into real
      government and healthcare deployments.</p>
    </div>`;
}

// Static mirror of src/components/blog/RelatedPosts.tsx - same scoring fn.
function relatedPostsHtml(post, allPosts) {
  const related = getRelatedPosts(post, allPosts, 3);
  if (related.length === 0) return '';
  return `
    <div>
      <h2>Related posts</h2>
      <ul>
        ${related.map(p => `<li><a href="/blog/${p.slug}">${escapeHtml(p.title)}</a></li>`).join('')}
      </ul>
    </div>`;
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

function patchShell({ path: routePath, title, description, ogType = 'website', image, datePublished, jsonLd, bodyHtml }) {
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
  if (image) {
    html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${image}$2`);
    html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${image}$2`);
  }
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeHtml(fullTitle)}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  if (ogType === 'article' && datePublished) {
    html = html.replace(/<\/head>/, `<meta property="article:published_time" content="${datePublished}" />\n  </head>`);
  }

  if (jsonLd) {
    const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    const ldScript = blocks.map(block => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`).join('\n') + '\n  </head>';
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
  const faqPairs = extractFaqPairs(post.content);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      dateModified: post.date,
      author: AUTHOR,
      image: post.coverImage ? absoluteUrl(post.coverImage) : undefined,
      keywords: post.tags.join(', '),
      mainEntityOfPage: canonicalUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
      ],
    },
  ];
  // FAQPage schema, when the post has one: this is the shape both Google's
  // FAQ rich results and generative answer engines (Perplexity, ChatGPT
  // browsing) pull from almost verbatim when citing a source.
  if (faqPairs.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqPairs.map(p => ({
        '@type': 'Question',
        name: p.question,
        acceptedAnswer: { '@type': 'Answer', text: p.answer },
      })),
    });
  }

  pages.push({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.excerpt,
    ogType: 'article',
    image: post.coverImage ? absoluteUrl(post.coverImage) : undefined,
    datePublished: post.date,
    jsonLd,
    bodyHtml: `
      <main>
        <article>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${formatDate(post.date)} &middot; ${readingTime(post.content)} min read</p>
          ${post.tags.length ? `<ul>${post.tags.map(t => `<li><a href="/blog/tag/${encodeURIComponent(t.toLowerCase())}">${escapeHtml(t)}</a></li>`).join('')}</ul>` : ''}
          <div class="md-body">${marked.parse(post.content)}</div>
          ${authorBioHtml()}
        </article>
        ${relatedPostsHtml(post, posts)}
      </main>`,
  });
}

// /blog/tag/<tag> - one hub page per subject/tag, so posts on the same
// subject surface together for both search engines and AI crawlers instead
// of only being cross-linked ad hoc via "related posts".
const tagSlugs = new Map();
for (const post of posts) {
  for (const tag of post.tags) {
    const slug = tag.toLowerCase();
    if (!tagSlugs.has(slug)) tagSlugs.set(slug, { label: tag, posts: [] });
    tagSlugs.get(slug).posts.push(post);
  }
}
for (const [slug, { label, posts: tagged }] of tagSlugs) {
  const canonicalUrl = `${SITE_URL}/blog/tag/${slug}`;
  const sorted = [...tagged].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  pages.push({
    path: `/blog/tag/${slug}`,
    title: `${label} posts`,
    description: `${sorted.length} post${sorted.length === 1 ? '' : 's'} tagged ${label}, by Dhruv Choudhary.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${label} posts`,
      url: canonicalUrl,
      isPartOf: { '@type': 'Blog', name: 'Blog', url: `${SITE_URL}/blog` },
      hasPart: sorted.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE_URL}/blog/${p.slug}` })),
    },
    bodyHtml: `
      <main>
        <h1>${escapeHtml(label)}</h1>
        <p>${sorted.length} post${sorted.length === 1 ? '' : 's'} tagged ${escapeHtml(label)}</p>
        <ul>
          ${sorted.map(p => `
          <li>
            <a href="/blog/${p.slug}">${escapeHtml(p.title)}</a>
            <p>${escapeHtml(p.excerpt)}</p>
            <span>${formatDate(p.date)} &middot; ${readingTime(p.content)} min read</span>
          </li>`).join('')}
        </ul>
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

// /watched - the only route whose content lives in Postgres rather than the
// repo, so the rows are fetched here at build time. A DB hiccup must never
// fail the whole build: on any error this falls back to meta + JSON-LD only
// and the CSR app fills the page in for real visitors regardless.
let watchedMovies = [];
if (process.env.POSTGRES_URL) {
  try {
    const { sql } = await import('@vercel/postgres');
    const { rows } = await sql`
      SELECT title, year, rating, review, tags, blog_slug
      FROM movies
      ORDER BY watched_on DESC NULLS LAST, created_at DESC
    `;
    watchedMovies = rows;
  } catch (err) {
    console.warn(`prerender: /watched DB fetch failed, emitting meta-only page (${err instanceof Error ? err.message : err})`);
  }
} else {
  console.warn('prerender: POSTGRES_URL unset, /watched gets a meta-only page');
}

pages.push({
  path: '/watched',
  title: 'Watched',
  description: 'Films watched, with personal ratings, tags, and short reviews by Dhruv Choudhary.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Watched',
    url: `${SITE_URL}/watched`,
    description: 'Films watched, with personal ratings, tags, and short reviews by Dhruv Choudhary.',
  },
  bodyHtml: `
    <main>
      <h1>Watched.</h1>
      <p>Films I've seen, rated honestly. Some have a few lines, some just a rating.</p>
      ${watchedMovies.length ? `<ul>
        ${watchedMovies.map(m => `
        <li>
          <h2>${escapeHtml(m.title)}${m.year ? ` (${m.year})` : ''}</h2>
          ${m.rating != null ? `<p>Rated ${m.rating} out of 5</p>` : ''}
          ${(m.tags ?? []).length ? `<p>${(m.tags ?? []).map(t => escapeHtml(t)).join(', ')}</p>` : ''}
          ${m.review ? `<p>${escapeHtml(m.review)}</p>` : ''}
          ${m.blog_slug ? `<a href="/blog/${m.blog_slug}">Read the post</a>` : ''}
        </li>`).join('')}
      </ul>` : ''}
    </main>`,
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
