// Classifies a visit's "nature" from request headers alone - no external API,
// no IP intelligence service. Order matters: script/crawler signatures are
// checked first because they're high-confidence positive matches; suspicious
// is a fallback bucket for requests that match neither list but still look
// off; anything left over defaults to human.

export type VisitorNature = 'human' | 'crawler' | 'script' | 'suspicious';

export const NATURE_LABELS: Record<VisitorNature, string> = {
  human: 'Human',
  crawler: 'Crawler',
  script: 'Script',
  suspicious: 'Suspicious',
};

// Tools, scripts, and headless automation - not search engines, which get
// their own allowlist below since they're generally welcome traffic.
const SCRIPT_PATTERNS: RegExp[] = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /\baxios\//i,
  /node-fetch/i,
  /go-http-client/i,
  /postmanruntime/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /okhttp/i,
  /java\//i,
  /libwww-perl/i,
  /\bscrapy\b/i,
];

// Known-good crawlers: search engines and link-preview bots. Not exhaustive,
// but covers the traffic a portfolio site actually sees.
const CRAWLER_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /slurp/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /applebot/i,
  /yandexbot/i,
  /baiduspider/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /slackbot/i,
];

// Catches generic "bot"/"spider"/"crawler" self-identification that isn't on
// either specific list above - still worth bucketing as script rather than
// falling through to suspicious/human.
const GENERIC_BOT_PATTERN = /bot|spider|crawler/i;

export function classifyVisitor(
  userAgent: string | null | undefined,
  headers: { acceptLanguage?: string | null; accept?: string | null } = {},
): VisitorNature {
  const ua = (userAgent ?? '').trim();

  if (!ua) return 'script';
  if (SCRIPT_PATTERNS.some(p => p.test(ua))) return 'script';
  if (CRAWLER_PATTERNS.some(p => p.test(ua))) return 'crawler';
  if (GENERIC_BOT_PATTERN.test(ua)) return 'script';

  const acceptLanguage = headers.acceptLanguage ?? '';
  const accept = headers.accept ?? '';
  const looksMalformed = ua.length < 15 || !/mozilla/i.test(ua);
  const missingLanguage = !acceptLanguage;
  const missingAccept = !accept;

  if (looksMalformed || (missingLanguage && missingAccept)) return 'suspicious';

  return 'human';
}
