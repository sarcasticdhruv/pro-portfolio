// Merges free-tier IP intelligence from three providers into one record.
// Called lazily, once per IP (see api/track.ts), never on the request's hot
// path - a slow or failing provider must never delay a pageview write.
//
// Provider roles, poorest to richest:
//   - ipinfo.io "Lite"  (IPINFO_TOKEN, unlimited): country + ASN only on the
//     free tier - no city, no privacy/VPN detection (those need a paid Core
//     plan). Used only to fill gaps the other two leave.
//   - ipapi.co (no key, ~1k req/day free): city-level geo + ASN/org, no
//     proxy/VPN flag.
//   - ip-api.com (no key, 45 req/min free): richest free tier - full geo,
//     ISP/org/ASN, AND proxy/hosting flags. Wins on any field overlap.
//
// None of this is authoritative (free-tier geolocation is approximate, and
// proxy/hosting detection is a best-effort heuristic on the provider's end
// too) - it's a signal to show alongside the header-based nature classifier,
// not a replacement for it.

export interface IpIntel {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  postal: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  isProxy: boolean | null;
  isHosting: boolean | null;
  fetchedAt: string;
}

interface IpApiComResponse {
  status: 'success' | 'fail';
  country?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  proxy?: boolean;
  hosting?: boolean;
}

interface IpApiCoResponse {
  error?: boolean;
  country_name?: string;
  region?: string;
  city?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  asn?: string;
}

interface IpInfoLiteResponse {
  country?: string;
  asn?: string;
  as_name?: string;
}

const FETCH_TIMEOUT_MS = 3000;

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fromIpApiCom(ip: string): Promise<Partial<IpIntel> | null> {
  const data = await fetchJson<IpApiComResponse>(
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

async function fromIpApiCo(ip: string): Promise<Partial<IpIntel> | null> {
  const data = await fetchJson<IpApiCoResponse>(`https://ipapi.co/${ip}/json/`);
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

async function fromIpInfoLite(ip: string): Promise<Partial<IpIntel> | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;
  const data = await fetchJson<IpInfoLiteResponse>(`https://api.ipinfo.io/lite/${ip}?token=${token}`);
  if (!data) return null;
  return {
    country: data.country ?? null,
    asn: data.asn ? `${data.asn} ${data.as_name ?? ''}`.trim() : null,
  };
}

// Merges best-effort results, richest provider first: a later provider only
// fills in fields the earlier ones left null, it never overwrites a value.
function merge(ip: string, parts: (Partial<IpIntel> | null)[]): IpIntel {
  const result: IpIntel = {
    ip, country: null, region: null, city: null, postal: null,
    lat: null, lon: null, timezone: null, isp: null, org: null, asn: null,
    isProxy: null, isHosting: null, fetchedAt: new Date().toISOString(),
  };
  for (const part of parts) {
    if (!part) continue;
    for (const key of Object.keys(part) as (keyof IpIntel)[]) {
      const value = part[key];
      if (value !== null && value !== undefined && result[key] === null) {
        (result as any)[key] = value;
      }
    }
  }
  return result;
}

export async function fetchIpIntel(ip: string): Promise<IpIntel> {
  const [ipApiCom, ipApiCo, ipInfoLite] = await Promise.all([
    fromIpApiCom(ip).catch(() => null),
    fromIpApiCo(ip).catch(() => null),
    fromIpInfoLite(ip).catch(() => null),
  ]);
  return merge(ip, [ipApiCom, ipApiCo, ipInfoLite]);
}
