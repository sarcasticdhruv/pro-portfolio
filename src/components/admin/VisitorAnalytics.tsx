import { Bar, Columns, ChartCard, StatTile, StatRow, ChartGrid, topCounts } from '../charts/Charts';

export interface Analytics {
  daily: { day: string; views: number; uniques: number }[];
  topPaths: { label: string; n: number }[];
  topReferrers: { label: string; n: number }[];
  topEvents: { label: string; n: number }[];
  byHour: { hour: string; n: number }[];
}

interface VisitorLike {
  country: string | null;
  city: string | null;
  userAgent: string | null;
  visitCount: number;
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
}

function browserOf(ua: string | null): string {
  if (!ua) return 'unknown';
  return /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'other';
}
function osOf(ua: string | null): string {
  if (!ua) return 'unknown';
  return /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux' : 'other';
}

// Strips a referrer down to its host, so 10 deep links from LinkedIn group as
// one source instead of fragmenting the chart into near-duplicate rows.
function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url.slice(0, 30); }
}

function lastNDays(daily: Analytics['daily'], n: number): [string, number][] {
  const map = new Map(daily.map(d => [d.day, d.views]));
  const out: [string, number][] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push([key.slice(5), map.get(key) ?? 0]);
  }
  return out;
}

export default function VisitorAnalytics({ analytics, visitors }: {
  analytics: Analytics | null;
  visitors: VisitorLike[];
}) {
  if (!analytics) return null;

  const totalViews = analytics.daily.reduce((s, d) => s + d.views, 0);
  const returning = visitors.filter(v => v.visitCount > 1).length;
  const totalEvents = visitors.reduce((s, v) => s + v.eventCount, 0);
  const avgEvents = visitors.length ? (totalEvents / visitors.length).toFixed(1) : '0';

  const countries = topCounts(visitors.map(v => v.country), 8);
  const cities = topCounts(visitors.map(v => v.city), 6);
  const browsers = topCounts(visitors.map(v => browserOf(v.userAgent)), 5);
  const oses = topCounts(visitors.map(v => osOf(v.userAgent)), 5);
  const referrers = topCounts(
    analytics.topReferrers.flatMap(r => Array(r.n).fill(hostOf(r.label))), 8,
  );

  // Hours are shown as a full 24-slot day so quiet hours read as quiet rather
  // than being omitted and making the day look shorter than it is.
  const hourMap = new Map(analytics.byHour.map(h => [h.hour, h.n]));
  const hours: [string, number][] = Array.from({ length: 24 }, (_, i) => {
    const k = String(i).padStart(2, '0');
    return [k, hourMap.get(k) ?? 0];
  });

  return (
    <div style={{ marginBottom: '36px' }}>
      <StatRow>
        <StatTile value={visitors.length} label="visitors" />
        <StatTile value={totalViews} label="views (30d)" />
        <StatTile value={totalEvents} label="events" />
        <StatTile value={returning} label="returning" />
        <StatTile value={avgEvents} label="events / visitor" />
      </StatRow>

      <ChartGrid>
        <ChartCard title="page views" note="last 30 days" wide>
          <Columns data={lastNDays(analytics.daily, 30)} height={100} />
        </ChartCard>

        <ChartCard title="top pages">
          {analytics.topPaths.length === 0 ? <Empty /> : analytics.topPaths.map(p => (
            <Bar key={p.label} label={p.label} count={p.n} labelWidth="120px"
              max={Math.max(...analytics.topPaths.map(x => x.n))} />
          ))}
        </ChartCard>

        <ChartCard title="referrers" note="by host">
          {referrers.length === 0 ? <Empty text="no external referrers yet" /> : referrers.map(([l, n]) => (
            <Bar key={l} label={l} count={n} labelWidth="120px" max={Math.max(...referrers.map(x => x[1]))} />
          ))}
        </ChartCard>

        <ChartCard title="countries">
          {countries.length === 0 ? <Empty /> : countries.map(([l, n]) => (
            <Bar key={l} label={l} count={n} max={Math.max(...countries.map(x => x[1]))} />
          ))}
        </ChartCard>

        <ChartCard title="cities">
          {cities.length === 0 ? <Empty /> : cities.map(([l, n]) => (
            <Bar key={l} label={l} count={n} max={Math.max(...cities.map(x => x[1]))} />
          ))}
        </ChartCard>

        <ChartCard title="browsers">
          {browsers.map(([l, n]) => (
            <Bar key={l} label={l} count={n} max={Math.max(...browsers.map(x => x[1]))} />
          ))}
        </ChartCard>

        <ChartCard title="operating systems">
          {oses.map(([l, n]) => (
            <Bar key={l} label={l} count={n} max={Math.max(...oses.map(x => x[1]))} />
          ))}
        </ChartCard>

        <ChartCard title="feature usage" note="non-pageview events">
          {analytics.topEvents.length === 0 ? <Empty text="no interactions yet" /> : analytics.topEvents.map(e => (
            <Bar key={e.label} label={e.label} count={e.n} labelWidth="130px"
              max={Math.max(...analytics.topEvents.map(x => x.n))} />
          ))}
        </ChartCard>

        <ChartCard title="activity by hour" note="UTC, all time" wide>
          <Columns data={hours} height={80} />
        </ChartCard>
      </ChartGrid>
    </div>
  );
}

function Empty({ text = 'no data yet' }: { text?: string }) {
  return (
    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>
      {text}
    </p>
  );
}
