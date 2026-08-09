import { useEffect } from 'react';

const SITE_URL = 'https://dhruv-choudhary.tech';
const DEFAULT_TITLE = 'Dhruv Choudhary - AI Engineer';
const DEFAULT_DESCRIPTION =
  'Dhruv Choudhary - AI Engineer & Software Developer. Building scalable AI systems, GenAI solutions, and full-stack applications.';
const DEFAULT_IMAGE = `${SITE_URL}/profile.png`;

interface ArticleMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  tags: string[];
}

interface SEOOptions {
  title?: string;
  description?: string;
  noindex?: boolean;
  /** Absolute or site-root-relative image URL. Blog posts pass their coverImage here
   *  so shares on LinkedIn/Twitter/Slack show the actual post art, not the profile photo. */
  image?: string;
  /** 'article' switches og:type, adds article:published_time, and injects BlogPosting
   *  JSON-LD so Google/crawlers can build rich results for the post. */
  type?: 'website' | 'article';
  publishedTime?: string;
  tags?: string[];
}

function setMeta(selector: string, value: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = value;
}

// article:published_time isn't in index.html's static <head> (only real pages
// have a publish date), so unlike setMeta this creates the tag on first use.
function setOrCreateMeta(property: string, value: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = value;
}

function removeMeta(property: string) {
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.remove();
}

function setCanonical(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function setRobots(content: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'robots';
    document.head.appendChild(meta);
  }
  meta.content = content;
}

const ARTICLE_JSONLD_ID = 'article-jsonld';

// Injects (or removes) a BlogPosting JSON-LD block distinct from index.html's
// static Person schema, so Google has real article structured data - headline,
// image, publish date, author - to build rich results from.
function setArticleJsonLd(article: ArticleMeta | null) {
  let script = document.getElementById(ARTICLE_JSONLD_ID) as HTMLScriptElement | null;
  if (!article) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = ARTICLE_JSONLD_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    image: article.image,
    url: article.url,
    datePublished: article.datePublished,
    keywords: article.tags.join(', '),
    author: { '@type': 'Person', name: 'Dhruv Choudhary', url: SITE_URL },
    publisher: { '@type': 'Person', name: 'Dhruv Choudhary', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
  });
}

function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${SITE_URL}${path}`;
}

// Syncs document.title, description/OG/Twitter meta, canonical link, robots
// directive, and (for articles) BlogPosting JSON-LD for the current route.
// Restores site defaults on unmount.
export function useSEO({ title, description, noindex, image, type = 'website', publishedTime, tags }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} · Dhruv Choudhary` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${window.location.pathname}`;
    const img = image ? absoluteUrl(image) : DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:type"]', type);
    setMeta('meta[property="og:image"]', img);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', img);
    setCanonical(url);
    setRobots(noindex ? 'noindex,follow' : 'index,follow');

    if (type === 'article' && title && publishedTime) {
      setOrCreateMeta('article:published_time', publishedTime);
      setArticleJsonLd({ title, description: desc, image: img, url, datePublished: publishedTime, tags: tags ?? [] });
    } else {
      removeMeta('article:published_time');
      setArticleJsonLd(null);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:title"]', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', SITE_URL);
      setMeta('meta[property="og:type"]', 'website');
      setMeta('meta[property="og:image"]', DEFAULT_IMAGE);
      setMeta('meta[name="twitter:title"]', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[name="twitter:image"]', DEFAULT_IMAGE);
      setCanonical(SITE_URL);
      setRobots('index,follow');
      removeMeta('article:published_time');
      setArticleJsonLd(null);
    };
  }, [title, description, noindex, image, type, publishedTime, tags]);
}
