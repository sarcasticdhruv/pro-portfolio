// One-off backfill: reclassifies every existing `visits` row's `nature`
// column from its stored user_agent. Run manually once after deploying the
// nature column - not part of any automated pipeline.
//
// Usage: POSTGRES_URL=... node scripts/backfill-visitor-nature.mjs [--dry-run]
//
// This is a plain JS port of src/lib/visitorNature.ts's classifyVisitor().
// Historical rows have no stored Accept/Accept-Language headers, so this
// port only uses the userAgent-based branches - the header-based
// "suspicious" checks that need acceptLanguage/accept always see them as
// absent here, which is an accepted limitation (see design spec).
import { sql } from '@vercel/postgres';

const SCRIPT_PATTERNS = [
  /curl\//i, /wget\//i, /python-requests/i, /python-urllib/i, /\baxios\//i,
  /node-fetch/i, /go-http-client/i, /postmanruntime/i, /headlesschrome/i,
  /puppeteer/i, /playwright/i, /okhttp/i, /java\//i, /libwww-perl/i, /\bscrapy\b/i,
];

const CRAWLER_PATTERNS = [
  /googlebot/i, /bingbot/i, /duckduckbot/i, /slurp/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /applebot/i, /yandexbot/i, /baiduspider/i,
  /discordbot/i, /telegrambot/i, /whatsapp/i, /slackbot/i,
];

const GENERIC_BOT_PATTERN = /bot|spider|crawler/i;

function classifyFromUserAgentOnly(userAgent) {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'script';
  if (SCRIPT_PATTERNS.some(p => p.test(ua))) return 'script';
  if (CRAWLER_PATTERNS.some(p => p.test(ua))) return 'crawler';
  if (GENERIC_BOT_PATTERN.test(ua)) return 'script';
  const looksMalformed = ua.length < 15 || !/mozilla/i.test(ua);
  if (looksMalformed) return 'suspicious';
  return 'human';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not set. Run `vercel env pull` first, or pass it inline.');
    process.exit(1);
  }

  const { rows } = await sql`SELECT id, user_agent FROM visits`;
  console.log(`Found ${rows.length} rows to reclassify.`);

  const counts = { human: 0, crawler: 0, script: 0, suspicious: 0 };
  const updates = rows.map(r => {
    const nature = classifyFromUserAgentOnly(r.user_agent);
    counts[nature]++;
    return { id: r.id, nature };
  });

  console.log('Projected distribution:', counts);

  if (dryRun) {
    console.log('Dry run - no rows updated. Re-run without --dry-run to apply.');
    return;
  }

  for (const { id, nature } of updates) {
    await sql`UPDATE visits SET nature = ${nature} WHERE id = ${id}`;
  }
  console.log(`Updated ${updates.length} rows.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
