// One-off backfill: enriches every distinct IP already in `visits` that
// isn't yet in `ip_intel`, using the same free-tier providers as
// src/lib/ipIntel.ts (fetchIpIntel), which only runs for IPs seen for the
// first time *after* that code shipped - older visits never got enriched.
// Not part of any automated pipeline; run manually once.
//
// Usage: POSTGRES_URL=... node scripts/backfill-ip-intel.mjs [--dry-run]
// Optional: IPINFO_TOKEN=... for the ipinfo.io Lite fallback (country+ASN only).
//
// This is a plain JS port of fetchIpIntel() - kept in sync by hand, same as
// backfill-visitor-nature.mjs's relationship to classifyVisitor().
//
// Paced to ip-api.com's free-tier limit (45 req/min): processes IPs in
// batches of 40 with a 65s pause between batches, well under the threshold
// even accounting for the other two providers running concurrently per IP.
import { sql } from '@vercel/postgres';

const FETCH_TIMEOUT_MS = 3000;
const BATCH_SIZE = 40;
const BATCH_PAUSE_MS = 65_000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fromIpApiCom(ip) {
  const data = await fetchJson(
    `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting`,
  );
  if (!data || data.status !== 'success') return null;
  return {
    country: data.country ?? null,
    region: data.regionName ?? null,
    city: data.city ?? null,
    postal: data.zip ?? null,
    lat: data.lat ?? null,
    lon: data.lon ?? null,
    timezone: data.timezone ?? null,
    isp: data.isp ?? null,
    org: data.org ?? null,
    asn: data.as ?? null,
    isProxy: data.proxy ?? null,
    isHosting: data.hosting ?? null,
  };
}

async function fromIpApiCo(ip) {
  const data = await fetchJson(`https://ipapi.co/${ip}/json/`);
  if (!data || data.error) return null;
  return {
    country: data.country_name ?? null,
    region: data.region ?? null,
    city: data.city ?? null,
    postal: data.postal ?? null,
    lat: data.latitude ?? null,
    lon: data.longitude ?? null,
    timezone: data.timezone ?? null,
    org: data.org ?? null,
    asn: data.asn ?? null,
  };
}

async function fromIpInfoLite(ip) {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;
  const data = await fetchJson(`https://api.ipinfo.io/lite/${ip}?token=${token}`);
  if (!data) return null;
  return {
    country: data.country ?? null,
    asn: data.asn ? `${data.asn} ${data.as_name ?? ''}`.trim() : null,
  };
}

function merge(ip, parts) {
  const result = {
    ip, country: null, region: null, city: null, postal: null,
    lat: null, lon: null, timezone: null, isp: null, org: null, asn: null,
    isProxy: null, isHosting: null, fetchedAt: new Date().toISOString(),
  };
  for (const part of parts) {
    if (!part) continue;
    for (const key of Object.keys(part)) {
      const value = part[key];
      if (value !== null && value !== undefined && result[key] === null) {
        result[key] = value;
      }
    }
  }
  return result;
}

async function fetchIpIntel(ip) {
  const [ipApiCom, ipApiCo, ipInfoLite] = await Promise.all([
    fromIpApiCom(ip).catch(() => null),
    fromIpApiCo(ip).catch(() => null),
    fromIpInfoLite(ip).catch(() => null),
  ]);
  return merge(ip, [ipApiCom, ipApiCo, ipInfoLite]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS ip_intel (
      ip TEXT PRIMARY KEY,
      country TEXT, region TEXT, city TEXT, postal TEXT,
      lat DOUBLE PRECISION, lon DOUBLE PRECISION, timezone TEXT,
      isp TEXT, org TEXT, asn TEXT,
      is_proxy BOOLEAN, is_hosting BOOLEAN,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not set. Run `vercel env pull` first, or pass it inline.');
    process.exit(1);
  }
  if (!process.env.IPINFO_TOKEN) {
    console.log('IPINFO_TOKEN not set - skipping the ipinfo.io fallback (ip-api.com and ipapi.co still run).');
  }

  await ensureTable();

  const { rows } = await sql`
    SELECT DISTINCT v.ip FROM visits v
    LEFT JOIN ip_intel i ON i.ip = v.ip
    WHERE v.ip IS NOT NULL AND v.ip <> '' AND i.ip IS NULL
  `;
  const ips = rows.map(r => r.ip);
  console.log(`Found ${ips.length} IPs to enrich.`);

  if (dryRun) {
    console.log('Dry run - no lookups performed. Re-run without --dry-run to apply.');
    console.log(ips.slice(0, 20).join('\n') + (ips.length > 20 ? `\n...and ${ips.length - 20} more` : ''));
    return;
  }

  let done = 0;
  for (let i = 0; i < ips.length; i += BATCH_SIZE) {
    const batch = ips.slice(i, i + BATCH_SIZE);
    for (const ip of batch) {
      const intel = await fetchIpIntel(ip);
      await sql`
        INSERT INTO ip_intel (ip, country, region, city, postal, lat, lon, timezone, isp, org, asn, is_proxy, is_hosting, fetched_at)
        VALUES (${intel.ip}, ${intel.country}, ${intel.region}, ${intel.city}, ${intel.postal}, ${intel.lat}, ${intel.lon}, ${intel.timezone}, ${intel.isp}, ${intel.org}, ${intel.asn}, ${intel.isProxy}, ${intel.isHosting}, ${intel.fetchedAt})
        ON CONFLICT (ip) DO NOTHING
      `;
      done++;
    }
    console.log(`Enriched ${done}/${ips.length}.`);
    if (i + BATCH_SIZE < ips.length) {
      console.log(`Pausing ${BATCH_PAUSE_MS / 1000}s to stay under ip-api.com's rate limit...`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  console.log(`Done. Enriched ${done} IPs.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
