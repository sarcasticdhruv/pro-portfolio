// Vercel Edge Function: read-only visitor dashboard data, gated behind
// ADMIN_KEY. Returns one row per known visitor (their latest snapshot +
// first-seen/visit-count) plus a short recent-activity log across everyone.

import { sql } from '@vercel/postgres';

export const config = { runtime: 'edge' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  const adminKey = process.env.ADMIN_KEY;
  const providedKey = new URL(req.url).searchParams.get('key');
  if (!adminKey || providedKey !== adminKey) return json({ error: 'unauthorized' }, 401);

  if (!process.env.POSTGRES_URL) return json({ error: 'tracking not configured' }, 503);

  try {
    const [latestPerVisitor, aggregates, recent] = await Promise.all([
      sql`
        SELECT DISTINCT ON (visitor_id)
          visitor_id, ip, country, city, user_agent, path AS last_path,
          referrer AS last_referrer, created_at AS last_seen
        FROM visits
        ORDER BY visitor_id, created_at DESC
      `,
      sql`
        SELECT visitor_id, MIN(created_at) AS first_seen, COUNT(*) AS visit_count
        FROM visits
        GROUP BY visitor_id
      `,
      sql`
        SELECT visitor_id, ip, country, path, referrer, created_at
        FROM visits
        ORDER BY created_at DESC
        LIMIT 100
      `,
    ]);

    const aggByVisitor = new Map(aggregates.rows.map(r => [r.visitor_id, r]));
    const visitors = latestPerVisitor.rows
      .map(v => ({
        visitorId: v.visitor_id,
        ip: v.ip,
        country: v.country,
        city: v.city,
        userAgent: v.user_agent,
        lastPath: v.last_path,
        lastReferrer: v.last_referrer,
        lastSeen: v.last_seen,
        firstSeen: aggByVisitor.get(v.visitor_id)?.first_seen ?? v.last_seen,
        visitCount: Number(aggByVisitor.get(v.visitor_id)?.visit_count ?? 1),
      }))
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    return json({
      visitors,
      recent: recent.rows.map(r => ({
        visitorId: r.visitor_id,
        ip: r.ip,
        country: r.country,
        path: r.path,
        referrer: r.referrer,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
  }
}
