// Vercel Edge Function: people trying to reach Dhruv (the admin "Inbox").
//
// POST  /api/leads              public. Upserts one lead per chat/voice
//                               session (keyed by a client-generated id), so
//                               details shared over several messages merge
//                               into a single row instead of many.
// GET   /api/leads?key=ADMIN    admin. All leads + IP intel + visit history.
// PATCH /api/leads?key=ADMIN    admin. { id, status } -> new | read | replied | archived
//
// Location/network come from Vercel's geo headers and the shared ip_intel
// cache (see api/track.ts, src/lib/ipIntel.ts), never from the client.

import { sql } from '@vercel/postgres';
import { waitUntil } from '@vercel/functions';
import { fetchIpIntel } from '../src/lib/ipIntel';

export const config = { runtime: 'edge' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

const SOURCES = ['form', 'chat', 'voice', 'email-draft'] as const;
const STATUSES = ['new', 'read', 'replied', 'archived'] as const;

const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, n) : null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function ensureTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      visitor_id TEXT,
      source TEXT NOT NULL,
      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      intent TEXT,
      message TEXT,
      transcript TEXT,
      ip TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      user_agent TEXT,
      page TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
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

async function enrichIp(ip: string): Promise<void> {
  try {
    const cached = await sql`SELECT ip FROM ip_intel WHERE ip = ${ip}`;
    if (cached.rows.length > 0) return;
    const i = await fetchIpIntel(ip);
    await sql`
      INSERT INTO ip_intel (ip, country, region, city, postal, lat, lon, timezone, isp, org, asn, is_proxy, is_hosting, fetched_at)
      VALUES (${i.ip}, ${i.country}, ${i.region}, ${i.city}, ${i.postal}, ${i.lat}, ${i.lon}, ${i.timezone}, ${i.isp}, ${i.org}, ${i.asn}, ${i.isProxy}, ${i.isHosting}, ${i.fetchedAt})
      ON CONFLICT (ip) DO NOTHING
    `;
  } catch {
    // best effort
  }
}

// Email to my real inbox via Resend (free tier: 3k emails/month). Off until
// RESEND_API_KEY is set. Without a verified domain Resend only delivers to
// the account owner's address, which is exactly who this is for.
interface LeadMail {
  source: string; name: string | null; email: string | null; phone: string | null; company: string | null;
  intent: string | null; message: string | null; city: string | null; country: string | null; page: string | null;
}

async function notifyByEmail(l: LeadMail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = process.env.NOTIFY_EMAIL || 'nrdhruv654@gmail.com';
  const from = process.env.NOTIFY_FROM || 'Portfolio <onboarding@resend.dev>';
  const via = l.source === 'form' ? 'contact form' : l.source === 'voice' ? 'voice call' : l.source === 'email-draft' ? 'chat (email draft)' : 'chat';
  const who = l.name || l.email || l.phone || 'Someone';
  const lines = [
    `${who} wants to reach you (${via}).`,
    '',
    l.message ? `"${l.message}"` : null,
    '',
    l.name ? `Name:     ${l.name}` : null,
    l.email ? `Email:    ${l.email}` : null,
    l.phone ? `Phone:    ${l.phone}` : null,
    l.company ? `Company:  ${l.company}` : null,
    l.intent ? `About:    ${l.intent}` : null,
    (l.city || l.country) ? `Location: ${[l.city, l.country].filter(Boolean).join(', ')} (approx., from IP)` : null,
    l.page ? `Page:     ${l.page}` : null,
    '',
    'Full details, location and conversation: https://dhruv-choudhary.tech/admin (Inbox tab)',
    l.email ? 'Reply to this email to answer them directly.' : null,
  ].filter(v => v !== null).join('\n');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New lead: ${who}${l.intent ? ` (${l.intent})` : ''} via ${via}`,
        text: lines,
        ...(l.email ? { reply_to: l.email } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // best effort; the lead is already saved in the Inbox
  }
}

async function handlePost(req: Request): Promise<Response> {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  // Honeypot: real visitors never see or fill this field.
  if (clip(b.website, 10)) return json({ ok: true });

  const clientId = clip(b.clientId, 80);
  if (!clientId) return json({ error: 'missing clientId' }, 400);
  const source = SOURCES.includes(b.source as typeof SOURCES[number]) ? (b.source as string) : 'chat';

  let email = clip(b.email, 200);
  if (email && !EMAIL_RE.test(email)) email = null;
  let phone = clip(b.phone, 40);
  if (phone && phone.replace(/\D/g, '').length < 7) phone = null;

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null;

  await ensureTables();

  // Abuse guard: a real person does not open 15 separate conversations an hour.
  if (ip) {
    const { rows } = await sql`SELECT COUNT(*)::int AS n FROM leads WHERE ip = ${ip} AND created_at > now() - interval '1 hour'`;
    if ((rows[0]?.n ?? 0) >= 15) return json({ error: 'too many requests' }, 429);
  }

  const decode = (h: string | null) => { try { return h ? decodeURIComponent(h) : null; } catch { return h; } };

  const prev = (await sql`SELECT email, phone, source FROM leads WHERE client_id = ${clientId}`).rows[0] as
    { email: string | null; phone: string | null; source: string } | undefined;

  const { rows } = await sql`
    INSERT INTO leads (client_id, visitor_id, source, name, email, phone, company, intent, message, transcript,
                       ip, country, region, city, user_agent, page)
    VALUES (${clientId}, ${clip(b.visitorId, 100)}, ${source}, ${clip(b.name, 120)}, ${email}, ${phone},
            ${clip(b.company, 120)}, ${clip(b.intent, 40)}, ${clip(b.message, 2000)}, ${clip(b.transcript, 8000)},
            ${ip}, ${req.headers.get('x-vercel-ip-country')}, ${decode(req.headers.get('x-vercel-ip-country-region'))},
            ${decode(req.headers.get('x-vercel-ip-city'))}, ${clip(req.headers.get('user-agent'), 400)}, ${clip(b.page, 200)})
    ON CONFLICT (client_id) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, leads.name),
      email = COALESCE(EXCLUDED.email, leads.email),
      phone = COALESCE(EXCLUDED.phone, leads.phone),
      company = COALESCE(EXCLUDED.company, leads.company),
      intent = COALESCE(EXCLUDED.intent, leads.intent),
      message = COALESCE(EXCLUDED.message, leads.message),
      transcript = COALESCE(EXCLUDED.transcript, leads.transcript),
      -- a submitted form is the strongest signal; never downgrade it
      source = CASE WHEN leads.source = 'form' THEN leads.source ELSE EXCLUDED.source END,
      -- new details from the visitor resurface an already-read lead
      status = CASE WHEN leads.status = 'archived' THEN leads.status ELSE 'new' END,
      updated_at = now()
    RETURNING id
  `;
  if (ip) waitUntil(enrichIp(ip));

  // Email me only when something worth acting on happens: a form submission,
  // or the first time this person's email/phone becomes known. Repeat saves
  // from the same chat (new messages, re-extraction) stay silent.
  const hadContact = !!(prev?.email || prev?.phone);
  const hasContact = !!(email || phone);
  const firstForm = source === 'form' && prev?.source !== 'form';
  if (firstForm || (hasContact && !hadContact)) {
    const r = (await sql`SELECT * FROM leads WHERE client_id = ${clientId}`).rows[0];
    if (r) {
      waitUntil(notifyByEmail({
        source: r.source, name: r.name, email: r.email, phone: r.phone, company: r.company,
        intent: r.intent, message: r.message, city: r.city, country: r.country, page: r.page,
      }));
    }
  }
  return json({ ok: true, id: rows[0]?.id });
}

async function handleGet(): Promise<Response> {
  await ensureTables();
  // visits may not exist on a fresh database
  await sql`CREATE TABLE IF NOT EXISTS visits (id BIGSERIAL PRIMARY KEY, visitor_id TEXT NOT NULL, ip TEXT, country TEXT, city TEXT, user_agent TEXT, referrer TEXT, path TEXT, event TEXT NOT NULL DEFAULT 'pageview', detail TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const { rows } = await sql`
    SELECT l.*,
      i.region AS ip_region, i.city AS ip_city, i.country AS ip_country, i.postal AS ip_postal,
      i.lat AS ip_lat, i.lon AS ip_lon, i.timezone AS ip_timezone, i.isp AS ip_isp, i.org AS ip_org,
      i.asn AS ip_asn, i.is_proxy AS ip_is_proxy, i.is_hosting AS ip_is_hosting,
      v.visit_count, v.first_seen, v.last_seen, v.pages, v.first_referrer
    FROM leads l
    LEFT JOIN ip_intel i ON i.ip = l.ip
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE event = 'pageview')::int AS visit_count,
        MIN(created_at) AS first_seen,
        MAX(created_at) AS last_seen,
        (SELECT array_agg(p) FROM (
          SELECT path AS p FROM visits
          WHERE visitor_id = l.visitor_id AND event = 'pageview' AND path IS NOT NULL
          GROUP BY path ORDER BY COUNT(*) DESC LIMIT 8
        ) t) AS pages,
        (SELECT referrer FROM visits WHERE visitor_id = l.visitor_id AND referrer IS NOT NULL AND referrer <> ''
         ORDER BY created_at ASC LIMIT 1) AS first_referrer
      FROM visits WHERE visitor_id = l.visitor_id
    ) v ON l.visitor_id IS NOT NULL
    WHERE l.status <> 'archived' OR l.updated_at > now() - interval '90 days'
    ORDER BY l.updated_at DESC
    LIMIT 300
  `;
  return json({
    leads: rows.map(r => ({
      id: Number(r.id),
      visitorId: r.visitor_id,
      source: r.source,
      name: r.name, email: r.email, phone: r.phone, company: r.company,
      intent: r.intent, message: r.message, transcript: r.transcript,
      status: r.status, page: r.page, userAgent: r.user_agent,
      createdAt: r.created_at, updatedAt: r.updated_at,
      ip: r.ip,
      location: {
        city: r.ip_city ?? r.city, region: r.ip_region ?? r.region, country: r.ip_country ?? r.country,
        postal: r.ip_postal, lat: r.ip_lat, lon: r.ip_lon, timezone: r.ip_timezone,
      },
      network: { isp: r.ip_isp, org: r.ip_org, asn: r.ip_asn, isProxy: r.ip_is_proxy, isHosting: r.ip_is_hosting },
      visits: r.visit_count == null ? null : {
        count: r.visit_count, firstSeen: r.first_seen, lastSeen: r.last_seen,
        pages: r.pages ?? [], firstReferrer: r.first_referrer,
      },
    })),
  });
}

async function handlePatch(req: Request): Promise<Response> {
  const b = await req.json().catch(() => ({})) as { id?: number; status?: string };
  if (!b.id || !STATUSES.includes(b.status as typeof STATUSES[number])) return json({ error: 'bad request' }, 400);
  await sql`UPDATE leads SET status = ${b.status}, updated_at = updated_at WHERE id = ${b.id}`;
  return json({ ok: true });
}

export default async function handler(req: Request): Promise<Response> {
  if (!process.env.POSTGRES_URL) return json({ error: 'database not configured' }, 503);
  try {
    if (req.method === 'POST') return await handlePost(req);

    const key = new URL(req.url).searchParams.get('key');
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return json({ error: 'unauthorized' }, 401);
    if (req.method === 'GET') return await handleGet();
    if (req.method === 'PATCH') return await handlePatch(req);
    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
  }
}
