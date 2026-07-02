// Free, keyless, CORS-open web reference tools callable straight from the
// browser: Wikipedia (search + summaries + thumbnails), DuckDuckGo Instant
// Answers (abstract + topic image) and Hacker News via Algolia (tech/news
// stories). These complement the web-tier model's own search and give the
// UI real images to show. Engines without CORS or a public API (Startpage,
// Mojeek, Google) cannot be called from a static frontend.

export interface WebSnippet {
  title: string;
  text: string;
  url: string;
}

export interface WebImage {
  url: string; // image src
  title: string;
  link: string; // page the image belongs to
}

export interface WebRefs {
  snippets: WebSnippet[];
  images: WebImage[];
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// Wikimedia thumbs come back tiny (~330px); request the 500px rendition
// (one of the sizes on Wikimedia's allowlist) so images can display larger.
function upscaleWikiThumb(src: string): string {
  return src.replace(/\/(\d+)px-/, '/500px-');
}

async function wikiRefs(query: string): Promise<WebRefs> {
  const snippets: WebSnippet[] = [];
  const images: WebImage[] = [];

  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`,
  );
  if (!searchRes.ok) throw new Error(`wiki search ${searchRes.status}`);
  const searchData = await searchRes.json();
  const titles: string[] = (searchData?.query?.search ?? [])
    .slice(0, 2)
    .map((s: any) => s.title);

  const summaries = await Promise.allSettled(
    titles.map(async title => {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      );
      if (!res.ok) throw new Error(`wiki summary ${res.status}`);
      return res.json();
    }),
  );

  for (const s of summaries) {
    if (s.status !== 'fulfilled') continue;
    const d = s.value;
    const url = d?.content_urls?.desktop?.page ?? '';
    if (d?.extract && url) {
      snippets.push({ title: d.title, text: d.extract, url });
    }
    if (d?.thumbnail?.source && url) {
      images.push({ url: upscaleWikiThumb(d.thumbnail.source), title: d.title, link: url });
    }
  }
  return { snippets, images };
}

async function ddgRefs(query: string): Promise<WebRefs> {
  const snippets: WebSnippet[] = [];
  const images: WebImage[] = [];

  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
  );
  if (!res.ok) throw new Error(`ddg ${res.status}`);
  const d = await res.json();

  if (d?.Abstract && d?.AbstractURL) {
    snippets.push({ title: d.Heading || query, text: d.Abstract, url: d.AbstractURL });
  }
  if (d?.Image) {
    const src = d.Image.startsWith('http') ? d.Image : `https://duckduckgo.com${d.Image}`;
    images.push({ url: src, title: d.Heading || query, link: d.AbstractURL || src });
  }
  // Related topics carry short texts + urls (first few only)
  for (const t of (d?.RelatedTopics ?? []).slice(0, 3)) {
    if (t?.Text && t?.FirstURL) {
      snippets.push({ title: t.Text.split(' - ')[0].slice(0, 60), text: t.Text, url: t.FirstURL });
    }
  }
  return { snippets, images };
}

// Image search engines rank on content words; filler like "show images of"
// wrecks relevance. Distill the query down to its topic before searching.
const IMAGE_FILLER = new Set([
  'show', 'give', 'find', 'get', 'display', 'me', 'some', 'any', 'a', 'an',
  'image', 'images', 'img', 'photo', 'photos', 'picture', 'pictures', 'pic',
  'pics', 'wallpaper', 'wallpapers', 'of', 'the', 'for', 'about', 'please',
  'pls', 'can', 'you', 'i', 'want', 'to', 'see', 'and', 'with', 'what', 'is',
  'are', 'tell', 'latest', 'best',
]);

export function distillImageQuery(query: string): string {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w && !IMAGE_FILLER.has(w));
  return (words.length > 0 ? words.slice(0, 5) : [query]).join(' ');
}

export function hasImageIntent(query: string): boolean {
  return /\b(image|images|photo|photos|picture|pictures|pics?|wallpapers?)\b/i.test(query);
}

// Openverse - CC image search engine (WordPress project). Keyless, CORS *,
// returns query-relevant images with proxied thumbnails. This is the main
// image source; wiki/ddg images are fallbacks.
async function openverseImages(query: string, count: number): Promise<WebRefs> {
  const topic = distillImageQuery(query);
  const res = await fetch(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(topic)}&page_size=${count + 4}&mature=false`,
  );
  if (!res.ok) throw new Error(`openverse ${res.status}`);
  const d = await res.json();

  const images: WebImage[] = (d?.results ?? [])
    .filter((r: any) => r?.thumbnail)
    .slice(0, count)
    .map((r: any) => ({
      url: r.thumbnail,
      title: r.title || topic,
      link: r.foreign_landing_url || r.url || r.thumbnail,
    }));
  return { snippets: [], images };
}

// Hacker News search via Algolia - CORS-open, keyless, great for tech topics
async function hnRefs(query: string): Promise<WebRefs> {
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=3&tags=story`,
  );
  if (!res.ok) throw new Error(`hn ${res.status}`);
  const d = await res.json();

  const snippets: WebSnippet[] = (d?.hits ?? [])
    .filter((h: any) => h?.title && h?.url && (h?.points ?? 0) >= 20)
    .slice(0, 2)
    .map((h: any) => ({
      title: h.title,
      text: `Hacker News discussion (${h.points} points): ${h.title}`,
      url: h.url,
    }));
  return { snippets, images: [] };
}

// Query all tools in parallel; any may fail or time out without affecting
// the others. Deduped by URL, capped small.
export async function fetchWebRefs(query: string, opts?: { imageCount?: number }): Promise<WebRefs> {
  const imageCount = opts?.imageCount ?? 6;
  // Openverse first in the image ordering: its results match the query,
  // while wiki/ddg images are just article thumbnails (fallback only).
  // Wiki/ddg also search the distilled topic so "show images of lion"
  // resolves to the lion article, not a search-phrase miss.
  const topic = distillImageQuery(query);
  const refQuery = hasImageIntent(query) ? topic : query;
  const [ov, wiki, ddg, hn] = await Promise.allSettled([
    withTimeout(openverseImages(query, imageCount), 7000),
    withTimeout(wikiRefs(refQuery), 6000),
    withTimeout(ddgRefs(refQuery), 6000),
    withTimeout(hnRefs(refQuery), 6000),
  ]);

  const snippets: WebSnippet[] = [];
  const images: WebImage[] = [];
  const seenUrl = new Set<string>();
  const seenImg = new Set<string>();

  for (const r of [ov, wiki, ddg, hn]) {
    if (r.status !== 'fulfilled') continue;
    for (const s of r.value.snippets) {
      if (seenUrl.has(s.url)) continue;
      seenUrl.add(s.url);
      snippets.push(s);
    }
    for (const img of r.value.images) {
      if (seenImg.has(img.url)) continue;
      seenImg.add(img.url);
      images.push(img);
    }
  }
  return { snippets: snippets.slice(0, 4), images: images.slice(0, imageCount) };
}
