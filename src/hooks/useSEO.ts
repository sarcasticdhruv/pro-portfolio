import { useEffect } from 'react';

const SITE_URL = 'https://dhruv-choudhary.tech';
const DEFAULT_TITLE = 'Dhruv Choudhary - AI Engineer';
const DEFAULT_DESCRIPTION =
  'Dhruv Choudhary - AI Engineer & Software Developer. Building scalable AI systems, GenAI solutions, and full-stack applications.';

interface SEOOptions {
  title?: string;
  description?: string;
  noindex?: boolean;
}

function setMeta(selector: string, value: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = value;
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

// Syncs document.title, description/OG meta, canonical link, and robots
// directive for the current route. Restores site defaults on unmount.
export function useSEO({ title, description, noindex }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} · Dhruv Choudhary` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${window.location.pathname}`;

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', url);
    setCanonical(url);
    setRobots(noindex ? 'noindex,follow' : 'index,follow');

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:title"]', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', SITE_URL);
      setCanonical(SITE_URL);
      setRobots('index,follow');
    };
  }, [title, description, noindex]);
}
