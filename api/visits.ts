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

    // ip_intel may not exist yet on a database that predates this feature -
    // the join below degrades to all-null intel fields rather than erroring.
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

    const [latestPerVisitor, aggregates, recent, daily, topPaths, topReferrers, topEvents, byHour, natureCounts] = await Promise.all([
      sql`
        SELECT DISTINCT ON (v.visitor_id)
          v.visitor_id, v.ip, v.country, v.city, v.user_agent, v.nature, v.path AS last_path,
          v.referrer AS last_referrer, v.created_at AS last_seen,
          i.region AS ip_region, i.postal AS ip_postal, i.lat AS ip_lat, i.lon AS ip_lon,
          i.timezone AS ip_timezone, i.isp AS ip_isp, i.org AS ip_org, i.asn AS ip_asn,
          i.is_proxy AS ip_is_proxy, i.is_hosting AS ip_is_hosting
        FROM visits v
        LEFT JOIN ip_intel i ON i.ip = v.ip
        ORDER BY v.visitor_id, v.created_at DESC
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
      sql`
        SELECT nature, COUNT(*) AS n FROM visits GROUP BY 1
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
          nature: v.nature,
          lastPath: v.last_path,
          lastReferrer: v.last_referrer,
          lastSeen: v.last_seen,
          firstSeen: agg?.first_seen ?? v.last_seen,
          visitCount: Number(agg?.visit_count ?? 1),
          eventCount: Number(agg?.event_count ?? 1),
          ipIntel: v.ip_isp || v.ip_org || v.ip_asn || v.ip_lat != null ? {
            region: v.ip_region,
            postal: v.ip_postal,
            lat: v.ip_lat != null ? Number(v.ip_lat) : null,
            lon: v.ip_lon != null ? Number(v.ip_lon) : null,
            timezone: v.ip_timezone,
            isp: v.ip_isp,
            org: v.ip_org,
            asn: v.ip_asn,
            isProxy: v.ip_is_proxy,
            isHosting: v.ip_is_hosting,
          } : null,
        };
      })
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    const natureBreakdown = { human: 0, crawler: 0, script: 0, suspicious: 0 };
    for (const row of natureCounts.rows) {
      const key = row.nature as keyof typeof natureBreakdown;
      if (key in natureBreakdown) natureBreakdown[key] = Number(row.n);
    }

    return json({
      visitors,
      analytics: {
        daily: daily.rows.map(r => ({ day: r.day, views: Number(r.views), uniques: Number(r.uniques) })),
        topPaths: topPaths.rows.map(r => ({ label: r.path, n: Number(r.n) })),
        topReferrers: topReferrers.rows.map(r => ({ label: r.referrer, n: Number(r.n) })),
        topEvents: topEvents.rows.map(r => ({ label: r.event, n: Number(r.n) })),
        byHour: byHour.rows.map(r => ({ hour: r.hour, n: Number(r.n) })),
        natureBreakdown,
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
