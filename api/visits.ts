// Vercel Edge Function: read-only visitor dashboard data, gated behind
// ADMIN_KEY.
//
// GET /api/visits?key=...              -> visitor summaries + recent activity
// GET /api/visits?key=...&visitor=<id> -> that one visitor's full event timeline

import { sql } from '@vercel/postgres';

export const config = { runtime: 'edge' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  const adminKey = process.env.ADMIN_KEY;
  const url = new URL(req.url);
  const providedKey = url.searchParams.get('key');
  if (!adminKey || providedKey !== adminKey) return json({ error: 'unauthorized' }, 401);

  if (!process.env.POSTGRES_URL) return json({ error: 'tracking not configured' }, 503);

  const visitorId = url.searchParams.get('visitor');

  try {
    // Drill-down: one visitor's full activity timeline (page views + every
    // click/toggle/command/search event), for the dashboard's expand row.
    if (visitorId) {
      const timeline = await sql`
        SELECT ip, country, city, path, event, detail, referrer, created_at
        FROM visits
        WHERE visitor_id = ${visitorId}
        ORDER BY created_at DESC
        LIMIT 300
      `;
      return json({
        events: timeline.rows.map(r => ({
          ip: r.ip, country: r.country, city: r.city, path: r.path,
          event: r.event, detail: r.detail, referrer: r.referrer, createdAt: r.created_at,
        })),
      });
    }

    const [latestPerVisitor, aggregates, recent] = await Promise.all([
      sql`
        SELECT DISTINCT ON (visitor_id)
          visitor_id, ip, country, city, user_agent, path AS last_path,
          referrer AS last_referrer, created_at AS last_seen
        FROM visits
        ORDER BY visitor_id, created_at DESC
      `,
      // visit_count/first_seen only count real page loads, not every click -
      // event_count is the total including interaction events.
      sql`
        SELECT visitor_id,
          MIN(created_at) FILTER (WHERE event = 'pageview') AS first_seen,
          COUNT(*) FILTER (WHERE event = 'pageview') AS visit_count,
          COUNT(*) AS event_count
        FROM visits
        GROUP BY visitor_id
      `,
      sql`
        SELECT visitor_id, ip, country, path, event, detail, referrer, created_at
        FROM visits
        ORDER BY created_at DESC
        LIMIT 100
      `,
    ]);

    const aggByVisitor = new Map(aggregates.rows.map(r => [r.visitor_id, r]));
    const visitors = latestPerVisitor.rows
      .map(v => {
        const agg = aggByVisitor.get(v.visitor_id);
        return {
          visitorId: v.visitor_id,
          ip: v.ip,
          country: v.country,
          city: v.city,
          userAgent: v.user_agent,
          lastPath: v.last_path,
          lastReferrer: v.last_referrer,
          lastSeen: v.last_seen,
          firstSeen: agg?.first_seen ?? v.last_seen,
          visitCount: Number(agg?.visit_count ?? 1),
          eventCount: Number(agg?.event_count ?? 1),
        };
      })
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    return json({
      visitors,
      recent: recent.rows.map(r => ({
        visitorId: r.visitor_id,
        ip: r.ip,
        country: r.country,
        path: r.path,
        event: r.event,
        detail: r.detail,
        referrer: r.referrer,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
  }
}
