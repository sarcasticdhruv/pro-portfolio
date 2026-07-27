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

    const [latestPerVisitor, aggregates, recent, daily, topPaths, topReferrers, topEvents, byHour] = await Promise.all([
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
      // Analytics are aggregated in SQL, not derived in the browser from the
      // 100-row `recent` sample above - that sample covers hours, not weeks,
      // so computing "traffic over time" or "top pages" from it would quietly
      // report the last hour as if it were all-time.
      sql`
        SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
               COUNT(*) FILTER (WHERE event = 'pageview') AS views,
               COUNT(DISTINCT visitor_id) AS uniques
        FROM visits
        WHERE created_at > now() - interval '30 days'
        GROUP BY 1 ORDER BY 1
      `,
      sql`
        SELECT path, COUNT(*) AS n FROM visits
        WHERE event = 'pageview' AND path IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `,
      sql`
        SELECT referrer, COUNT(*) AS n FROM visits
        WHERE referrer IS NOT NULL AND referrer <> ''
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `,
      sql`
        SELECT event, COUNT(*) AS n FROM visits
        WHERE event <> 'pageview'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 12
      `,
      sql`
        SELECT to_char(created_at AT TIME ZONE 'UTC', 'HH24') AS hour, COUNT(*) AS n
        FROM visits GROUP BY 1 ORDER BY 1
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
      analytics: {
        daily: daily.rows.map(r => ({ day: r.day, views: Number(r.views), uniques: Number(r.uniques) })),
        topPaths: topPaths.rows.map(r => ({ label: r.path, n: Number(r.n) })),
        topReferrers: topReferrers.rows.map(r => ({ label: r.referrer, n: Number(r.n) })),
        topEvents: topEvents.rows.map(r => ({ label: r.event, n: Number(r.n) })),
        byHour: byHour.rows.map(r => ({ hour: r.hour, n: Number(r.n) })),
      },
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
