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
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    data[key] = val;
  }
  return data;
}

function loadPublishedPosts() {
  return readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = readFileSync(path.join(BLOG_DIR, f), 'utf-8');
      const data = parseFrontmatter(raw);
      return { slug: f.replace(/\.md$/, ''), date: data.date || '', published: data.published === 'true' };
    })
    .filter(p => p.published);
}

const staticRoutes = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.8', changefreq: 'weekly' },
  { loc: '/games', priority: '0.5', changefreq: 'monthly' },
];

const posts = loadPublishedPosts();
const postRoutes = posts.map(p => ({
  loc: `/blog/${p.slug}`,
  lastmod: p.date || undefined,
  priority: '0.7',
  changefreq: 'monthly',
}));

const urls = [...staticRoutes, ...postRoutes];

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
