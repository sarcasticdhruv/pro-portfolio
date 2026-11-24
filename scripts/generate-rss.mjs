// Generates public/rss.xml from published blog posts. Feeds are a discovery
// signal for crawlers/aggregators and give every new post a second crawlable
// entry point beyond the sitemap. Runs as a `prebuild` step.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE_URL = 'https://dhruv-choudhary.tech';
const BLOG_DIR = path.join(ROOT, 'content', 'blog');

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
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const posts = readdirSync(BLOG_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => ({ slug: f.replace(/\.md$/, ''), ...frontmatter(readFileSync(path.join(BLOG_DIR, f), 'utf-8')) }))
  .filter(p => p.published === 'true')
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const items = posts.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.excerpt ?? '')}</description>
    </item>`).join('\n');

writeFileSync(path.join(ROOT, 'public', 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dhruv Choudhary - Blog</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Writing on AI engineering, RAG systems, and shipping production ML.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`);
console.log(`rss.xml written with ${posts.length} items`);
