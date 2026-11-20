// Vercel Edge Function: serves the tailored CV PDFs and records each open in the
// same `visits` table as the site's own tracking, so recruiter opens show up in
// the admin dashboard. A bare PDF link runs no JavaScript, so the browser-side
// tracker (src/lib/track.ts) never sees it; this does the logging server-side.
//
// /cv/<name>.pdf is rewritten here (see vercel.json); the files themselves live in
// public/cv-files/. Logging is best-effort and never blocks or breaks the download.

import { sql } from '@vercel/postgres';
import { waitUntil } from '@vercel/functions';
import { classifyVisitor } from '../src/lib/visitorNature';

export const config = { runtime: 'edge' };

async function sha(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function record(req: Request, file: string): Promise<void> {
  if (!process.env.POSTGRES_URL) return;
  try {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null;
    const ua = req.headers.get('user-agent');
    const nature = classifyVisitor(ua, {
      acceptLanguage: req.headers.get('accept-language'),
      accept: req.headers.get('accept'),
    });
    // No cookie on a PDF request, so derive a stable anonymous id from IP + user agent.
    const visitorId = 'cv-' + (await sha(`${ip}|${ua}`));
    await sql`
      INSERT INTO visits (visitor_id, ip, country, city, user_agent, referrer, path, event, detail, nature)
      VALUES (${visitorId}, ${ip}, ${req.headers.get('x-vercel-ip-country')}, ${req.headers.get('x-vercel-ip-city')},
              ${ua}, ${req.headers.get('referer')}, ${'/cv/' + file}, 'cv_open', ${file}, ${nature})
    `;
  } catch {
    // The table may not exist yet or the DB may be down; the CV must still load.
  }
}

export default async function handler(req: Request): Promise<Response> {
  const file = new URL(req.url).searchParams.get('f') ?? '';
  if (!/^[a-z0-9][a-z0-9-]*\.pdf$/i.test(file)) return new Response('Not found', { status: 404 });

  const upstream = await fetch(new URL(`/cv-files/${file}`, req.url));
  if (!upstream.ok) return new Response('Not found', { status: 404 });

  if (req.method !== 'HEAD') waitUntil(record(req, file));
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file}"`,
      'Cache-Control': 'private, no-store', // keep it uncached so every open reaches this function
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
