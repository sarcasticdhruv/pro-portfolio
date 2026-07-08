// Vercel Edge Function: records a page visit OR a named interaction event
// (click, toggle, terminal command, search query, etc - see trackEvent() in
// src/lib/track.ts). Both share one row shape and one timeline per visitor,
// distinguished by the `event` column ('pageview' by default).
//
// Reads the visitor's IP and Vercel's free geo headers server-side (never
// trusts anything the client claims about its own location), and appends a
// row to the `visits` table. Fails silently if the database isn't wired up
// yet (POSTGRES_URL unset) so a missing DB never breaks the site itself.

import { sql } from '@vercel/postgres';

export const config = { runtime: 'edge' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id BIGSERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      ip TEXT,
      country TEXT,
      city TEXT,
      user_agent TEXT,
      referrer TEXT,
      path TEXT,
      event TEXT NOT NULL DEFAULT 'pageview',
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Columns added after the table's first deployment - safe no-ops once applied.
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS event TEXT NOT NULL DEFAULT 'pageview'`;
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS detail TEXT`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!process.env.POSTGRES_URL) return json({ ok: false, error: 'tracking not configured' });

  let body: { visitorId?: string; path?: string; referrer?: string; event?: string; detail?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const visitorId = (body.visitorId ?? '').slice(0, 100);
  if (!visitorId) return json({ error: 'missing visitorId' }, 400);

  // x-forwarded-for can carry a client-proxy chain ("client, proxy1, proxy2");
  // the first entry is the actual visitor.
  const forwardedFor = req.headers.get('x-forwarded-for') ?? '';
  const ip = forwardedFor.split(',')[0].trim() || req.headers.get('x-real-ip') || null;
  const country = req.headers.get('x-vercel-ip-country');
  const city = req.headers.get('x-vercel-ip-city');
  const userAgent = req.headers.get('user-agent');
  const event = (body.event ?? 'pageview').slice(0, 60);
  const detail = body.detail ? body.detail.slice(0, 300) : null;

  try {
    await ensureTable();
    await sql`
      INSERT INTO visits (visitor_id, ip, country, city, user_agent, referrer, path, event, detail)
      VALUES (${visitorId}, ${ip}, ${country}, ${city}, ${userAgent}, ${body.referrer ?? null}, ${body.path ?? null}, ${event}, ${detail})
    `;
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'db error' });
  }
}
