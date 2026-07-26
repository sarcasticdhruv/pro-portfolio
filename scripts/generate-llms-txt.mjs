// Generates public/llms.txt - a plain-markdown index of the site for AI
// crawlers/agents that check for the emerging llms.txt convention, so they
// don't have to parse HTML to find what's here. Runs as a `prebuild` step,
// same convention as scripts/generate-sitemap.mjs (which this mirrors for
// reading content/blog/*.md).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE_URL = 'https://dhruv-choudhary.tech';
const BLOG_DIR = path.join(ROOT, 'content', 'blog');
const OUT_FILE = path.join(ROOT, 'public', 'llms.txt');

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
      const data = parseFrontmatter(readFileSync(path.join(BLOG_DIR, f), 'utf-8'));
      return {
        slug: f.replace(/\.md$/, ''),
        title: data.title || '',
        excerpt: data.excerpt || '',
        date: data.date || '',
        published: data.published === 'true',
      };
    })
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const posts = loadPublishedPosts();

const txt = `# Dhruv Choudhary

> AI Engineer building GenAI systems, RAG pipelines, and production ML. B.Tech from MITS Gwalior (Department Rank 2), currently at AI LifeBOT.

## Site

- [Home](${SITE_URL}/): About, experience, projects, skills, achievements, contact.
- [Blog](${SITE_URL}/blog): Writing on AI engineering, RAG systems, and shipping production ML.
- [Search](${SITE_URL}/search): Agentic search over this site and the web.
- [Imagine](${SITE_URL}/imagine): Free in-browser AI image generation.
- [Arcade](${SITE_URL}/games): Snake, 2048, Tic-Tac-Toe, and Chess.

## Blog posts

${posts.map(p => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.excerpt}`).join('\n')}
`;

writeFileSync(OUT_FILE, txt);
console.log(`llms.txt written with ${posts.length} posts`);
