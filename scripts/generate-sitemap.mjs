// Generates public/sitemap.xml from static routes + published blog posts.
// Runs as a `prebuild` step so vite's static copy picks up the fresh file.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE_URL = 'https://dhruv-choudhary.tech';
const BLOG_DIR = path.join(ROOT, 'content', 'blog');
const OUT_FILE = path.join(ROOT, 'public', 'sitemap.xml');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val.slice(1, -1).split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      continue;
    }
    data[key] = val.replace(/^["']|["']$/g, '');
  }
  return data;
}

function loadPublishedPosts() {
  return readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = readFileSync(path.join(BLOG_DIR, f), 'utf-8');
      const data = parseFrontmatter(raw);
      return {
        slug: f.replace(/\.md$/, ''),
        date: data.date || '',
        published: data.published === 'true',
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    })
    .filter(p => p.published);
}

const staticRoutes = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.8', changefreq: 'weekly' },
  { loc: '/games', priority: '0.5', changefreq: 'monthly' },
  { loc: '/search', priority: '0.5', changefreq: 'monthly' },
  { loc: '/imagine', priority: '0.5', changefreq: 'monthly' },
  { loc: '/watched', priority: '0.5', changefreq: 'weekly' },
];

const posts = loadPublishedPosts();
const postRoutes = posts.map(p => ({
  loc: `/blog/${p.slug}`,
  lastmod: p.date || undefined,
  priority: '0.7',
  changefreq: 'monthly',
}));

// One hub page per subject/tag, so topically-clustered posts are indexable
// as a set, not just individually. Only tags shared by 2+ posts are listed
// here - a single-post tag page's only unique content is "1 post tagged X"
// plus that one post's own card, which reads to Google as thin/near-
// duplicate content at scale (dozens of near-empty hub pages diluted a much
// smaller set of real posts, a likely contributor to mass "Discovered -
// currently not indexed" in Search Console). The pages themselves still
// exist and stay linked from each post for site visitors; this only
// controls what gets submitted to Google for crawling/indexing priority.
// encodeURIComponent matches prerender.mjs's on-disk path exactly, so a
// multi-word tag ("ai safety") produces a real percent-encoded URL segment
// instead of the literal, spec-invalid space previously written to <loc>.
const tagCounts = new Map();
for (const p of posts) for (const t of p.tags) {
  const slug = t.toLowerCase();
  tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
}
const tagRoutes = [...tagCounts.entries()]
  .filter(([, count]) => count >= 2)
  .map(([slug]) => ({
    loc: `/blog/tag/${encodeURIComponent(slug)}`,
    priority: '0.5',
    changefreq: 'monthly',
  }));

const urls = [...staticRoutes, ...postRoutes, ...tagRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(OUT_FILE, xml);
console.log(`sitemap.xml written with ${urls.length} URLs`);
