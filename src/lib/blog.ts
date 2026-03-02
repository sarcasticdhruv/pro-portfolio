// ── Types ─────────────────────────────────────────────────────────────────────
export interface PostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  coverImage: string;
  published: boolean;
}

export interface Post extends PostFrontmatter {
  slug: string;
  content: string;         // raw markdown (body, no frontmatter)
  readingTime: number;     // minutes
}

// ── Frontmatter parser ────────────────────────────────────────────────────────
// Zero-dependency inline YAML parser for the simple frontmatter subset we use.
function parseFrontmatter(raw: string): { data: Partial<PostFrontmatter>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlStr = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (!key) continue;

    // Inline array: [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val
        .slice(1, -1)
        .split(',')
        .map(t => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      continue;
    }
    if (val === 'true')  { data[key] = true; continue; }
    if (val === 'false') { data[key] = false; continue; }
    if (val !== '' && /^\d+$/.test(val)) { data[key] = parseInt(val, 10); continue; }
    data[key] = val.replace(/^["']|["']$/g, '');
  }

  return { data: data as Partial<PostFrontmatter>, content: content.trimStart() };
}

// ── Reading time ──────────────────────────────────────────────────────────────
function calcReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── Slug from file path ───────────────────────────────────────────────────────
function pathToSlug(path: string): string {
  return path.replace(/^.*[\\/]/, '').replace(/\.md$/, '');
}

// ── Load all posts ────────────────────────────────────────────────────────────
// Vite import.meta.glob with eager:true bundles the markdown at build time.
const RAW_FILES = import.meta.glob('/content/blog/*.md', {
  as: 'raw',
  eager: true,
}) as Record<string, string>;

function loadAllPosts(): Post[] {
  return Object.entries(RAW_FILES)
    .map(([path, raw]) => {
      const slug = pathToSlug(path);
      const { data, content } = parseFrontmatter(raw);
      return {
        slug,
        title:      data.title      ?? slug,
        date:       data.date       ?? '',
        excerpt:    data.excerpt    ?? '',
        tags:       data.tags       ?? [],
        coverImage: data.coverImage ?? '',
        published:  data.published  ?? false,
        content,
        readingTime: calcReadingTime(content),
      } satisfies Post;
    })
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Singleton - evaluated once at module load (all eager, no async needed)
export const ALL_POSTS: Post[] = loadAllPosts();

export function getPost(slug: string): Post | undefined {
  return ALL_POSTS.find(p => p.slug === slug);
}

// ── Date formatter ────────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
