import { Fragment, useEffect, useState } from 'react';
import { Lock, RotateCw, Users, Activity, ChevronDown, ChevronRight, Inbox, BarChart3 } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import VisitorAnalytics, { type Analytics } from '../components/admin/VisitorAnalytics';
import LeadsInbox, { type Lead } from '../components/admin/LeadsInbox';
import { Pill } from '../components/charts/Charts';
import { NATURE_LABELS, type VisitorNature } from '../lib/visitorNature';

const SESSION_KEY = 'admin_key';

interface IpIntel {
  region: string | null;
  postal: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  isProxy: boolean | null;
  isHosting: boolean | null;
}

interface VisitorRow {
  visitorId: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  nature: VisitorNature;
  lastPath: string | null;
  lastReferrer: string | null;
  lastSeen: string;
  firstSeen: string;
  visitCount: number;
  eventCount: number;
  ipIntel: IpIntel | null;
}

interface RecentRow {
  visitorId: string;
  ip: string | null;
  country: string | null;
  path: string | null;
  event: string;
  detail: string | null;
  referrer: string | null;
  createdAt: string;
}

interface TimelineEvent {
  ip: string | null;
  country: string | null;
  city: string | null;
  path: string | null;
  event: string;
  detail: string | null;
  referrer: string | null;
  createdAt: string;
}

function parseUA(ua: string | null): string {
  if (!ua) return 'unknown';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'other';
  const os = /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : 'other';
  return `${browser} · ${os}`;
}

function natureTone(nature: VisitorNature): 'accent' | 'info' | 'warning' | 'danger' {
  switch (nature) {
    case 'human': return 'accent';
    case 'crawler': return 'info';
    case 'script': return 'warning';
    case 'suspicious': return 'danger';
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Renders a single activity row's action + free-text detail together, e.g.
// "pageview /search", "click GitHub", "terminal_command help".
function ActionCell({ event, detail, path }: { event: string; detail: string | null; path?: string | null }) {
  return (
    <span>
      <span style={{ color: 'var(--accent)' }}>{event}</span>
      {(detail || path) && <span style={{ color: 'var(--text-muted)' }}> · {detail ?? path}</span>}
    </span>
  );
}

function localTimeIn(tz: string | null | undefined): string | null {
  if (!tz) return null;
  try { return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }); } catch { return null; }
}

function referrerHost(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    return h === location.hostname ? null : h;
  } catch { return ref.slice(0, 30); }
}

// ISP/org name plus a proxy/hosting flag, from the free-tier IP intel cache
// (see src/lib/ipIntel.ts) - null when that IP hasn't been enriched yet.
function NetworkCell({ intel }: { intel: IpIntel | null }) {
  if (!intel) return <span style={{ color: 'var(--text-dim)' }}>-</span>;
  const label = intel.isp || intel.org || intel.asn || '-';
  return (
    <span title={intel.asn ?? undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {label}
      {intel.isProxy && <Pill label="proxy" tone="warning" />}
      {intel.isHosting && <Pill label="hosting" tone="info" />}
    </span>
  );
}

export default function AdminPage() {
  useSEO({ title: 'Admin', noindex: true });

  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Record<string, TimelineEvent[]>>({});
  const [timelineLoading, setTimelineLoading] = useState<string | null>(null);
  const [natureFilter, setNatureFilter] = useState<VisitorNature | 'all'>('all');

  // Two views on one page: site visitors, and the Inbox of people who tried
  // to reach me through the chatbot (form, chat, voice).
  const [view, setView] = useState<'visitors' | 'inbox'>('visitors');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsError, setLeadsError] = useState('');
  // Charts are long; keep them folded until asked for.
  const [showCharts, setShowCharts] = useState(false);

  async function loadLeads(k: string) {
    try {
      const res = await fetch(`/api/leads?key=${encodeURIComponent(k)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'request failed');
      setLeads(data.leads ?? []);
      setLeadsError('');
    } catch (e) {
      setLeadsError(e instanceof Error ? e.message : 'failed to load inbox');
    }
  }

  function setLeadStatus(id: number, status: Lead['status']) {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)));
    fetch(`/api/leads?key=${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  async function load(k: string) {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`/api/visits?key=${encodeURIComponent(k)}`);
      if (res.status === 401) {
        setAuthed(false);
        setAuthError('wrong key');
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'request failed');
      setVisitors(data.visitors ?? []);
      setRecent(data.recent ?? []);
      setAnalytics(data.analytics ?? null);
      setAuthed(true);
      void loadLeads(k);
      sessionStorage.setItem(SESSION_KEY, k);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(visitorId: string) {
    if (expanded === visitorId) {
      setExpanded(null);
      return;
    }
    setExpanded(visitorId);
    if (timelines[visitorId]) return; // already fetched
    setTimelineLoading(visitorId);
    try {
      const res = await fetch(`/api/visits?key=${encodeURIComponent(key)}&visitor=${encodeURIComponent(visitorId)}`);
      const data = await res.json();
      setTimelines(prev => ({ ...prev, [visitorId]: data.events ?? [] }));
    } catch {
      setTimelines(prev => ({ ...prev, [visitorId]: [] }));
    } finally {
      setTimelineLoading(null);
    }
  }

  // Reuse a key already verified earlier this session, so reloading /admin
  // doesn't ask again every time.
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setKey(saved);
      void load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // visitor id -> lead name/"reached out", for the badge in the Visitors table
  const leadByVisitor = new Map(
    leads.filter(l => l.visitorId).map(l => [l.visitorId as string, l.name ? `lead: ${l.name.split(' ')[0]}` : 'reached out']),
  );

  const filteredVisitors = natureFilter === 'all'
    ? visitors
    : visitors.filter(v => v.nature === natureFilter);

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <form
          onSubmit={e => { e.preventDefault(); void load(key); }}
          style={{
            width: '100%', maxWidth: '320px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: '14px', padding: '28px 24px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Lock size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              admin
            </span>
          </div>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="access key"
            autoFocus
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-2)',
              borderRadius: '8px', padding: '10px 12px', color: 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', outline: 'none',
              marginBottom: '12px',
            }}
          />
          <button
            type="submit"
            disabled={loading || !key.trim()}
            style={{
              width: '100%', background: 'var(--accent)', color: 'var(--chat-user-text)',
              border: 'none', borderRadius: '8px', padding: '10px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', fontWeight: 600,
              cursor: loading || !key.trim() ? 'default' : 'pointer',
              opacity: loading || !key.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'checking...' : 'unlock'}
          </button>
          {authError && (
            <p style={{ color: '#FF6B6B', fontSize: '0.75rem', marginTop: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
              {authError}
            </p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '110px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 24px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 700 }}>
            {view === 'visitors' ? 'Visitors' : 'Inbox'}<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <button
            onClick={() => { void load(key); void loadLeads(key); }}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: '7px', padding: '8px 14px', color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            <RotateCw size={12} className={loading ? 'spin-slow' : ''} />
            refresh
          </button>
        </div>

        {fetchError && (
          <p style={{ color: '#FF6B6B', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', marginBottom: '16px' }}>
            {fetchError}
          </p>
        )}

        {/* View switch */}
        <div style={{
          display: 'inline-flex', gap: '4px', padding: '4px', marginBottom: '24px',
          border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface)',
        }}>
          {([
            { key: 'visitors', label: 'Visitors', Icon: Users, badge: 0 },
            { key: 'inbox', label: 'Inbox', Icon: Inbox, badge: leads.filter(l => l.status === 'new').length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
                borderRadius: '7px', border: 'none', cursor: 'pointer',
                background: view === t.key ? 'var(--accent)' : 'transparent',
                color: view === t.key ? 'var(--chat-user-text)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', fontWeight: 600,
              }}
            >
              <t.Icon size={13} /> {t.label}
              {t.badge > 0 && (
                <span style={{
                  minWidth: '18px', height: '18px', borderRadius: '9px', padding: '0 5px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.64rem',
                  background: view === t.key ? 'var(--chat-user-text)' : 'var(--accent)',
                  color: view === t.key ? 'var(--accent)' : 'var(--chat-user-text)',
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {view === 'inbox' ? (
          <LeadsInbox leads={leads} error={leadsError} onStatus={setLeadStatus} />
        ) : (<>
        {/* Analytics charts: folded by default */}
        <button
          onClick={() => setShowCharts(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 14px', marginBottom: showCharts ? '14px' : '28px',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
            cursor: 'pointer', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem',
          }}
        >
          {showCharts ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <BarChart3 size={13} style={{ color: 'var(--accent)' }} />
          {showCharts ? 'hide analytics' : 'show analytics'}
          <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>{visitors.length} visitors</span>
        </button>
        {showCharts && <VisitorAnalytics analytics={analytics} visitors={visitors} />}

        {/* Visitors table */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
          <Users size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {filteredVisitors.length} known visitor{filteredVisitors.length === 1 ? '' : 's'} · click a row for full activity
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {(['all', 'human', 'crawler', 'script', 'suspicious'] as const).map(f => (
            <button
              key={f}
              onClick={() => setNatureFilter(f)}
              style={{
                background: natureFilter === f ? 'var(--accent)' : 'var(--surface-2)',
                color: natureFilter === f ? 'var(--chat-user-text)' : 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: '100px',
                padding: '5px 14px', fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem', cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        {/* Stretched past the page column (this table only) so every field
            fits without squeezing: up to 1600px, never wider than the viewport. */}
        <div style={{
          position: 'relative', left: '50%', transform: 'translateX(-50%)',
          width: 'min(1600px, calc(100vw - 32px))',
          overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px',
          marginBottom: '36px', background: 'var(--surface)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                {['', 'visitor', 'ip', 'location', 'local time', 'network', 'device', 'nature', 'came from', 'visits', 'events', 'seen (first → last)', 'last page'].map(h => (
                  <th key={h} style={{ padding: '10px 9px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map(v => {
                const isOpen = expanded === v.visitorId;
                return (
                  <Fragment key={v.visitorId}>
                    <tr
                      onClick={() => void toggleExpand(v.visitorId)}
                      style={{ borderBottom: isOpen ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '10px 8px 10px 14px', color: 'var(--text-dim)' }}>
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {v.visitorId.slice(0, 8)}
                        {leadByVisitor.has(v.visitorId) && (
                          <span
                            onClick={e => { e.stopPropagation(); setView('inbox'); }}
                            title="This visitor reached out - open Inbox"
                            style={{ marginLeft: '6px', cursor: 'pointer' }}
                          >
                            <Pill label={leadByVisitor.get(v.visitorId)!} tone="accent" />
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{v.ip ?? '-'}</td>
                      <td style={{ padding: '10px 9px', color: 'var(--text)', minWidth: '160px' }}>
                        {[v.city, v.ipIntel?.region, v.country].filter(Boolean).join(', ') || '-'}
                        {v.ipIntel?.postal && <span style={{ color: 'var(--text-dim)' }}> {v.ipIntel.postal}</span>}
                        {v.ipIntel?.lat != null && v.ipIntel?.lon != null && (
                          <a
                            href={`https://www.google.com/maps?q=${v.ipIntel.lat},${v.ipIntel.lon}`}
                            target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ color: 'var(--accent)', textDecoration: 'none', marginLeft: '6px' }}
                          >map</a>
                        )}
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {localTimeIn(v.ipIntel?.timezone) ?? '-'}
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        <NetworkCell intel={v.ipIntel} />
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{parseUA(v.userAgent)}</td>
                      <td style={{ padding: '10px 9px' }}>
                        <Pill label={NATURE_LABELS[v.nature]} tone={natureTone(v.nature)} />
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {referrerHost(v.lastReferrer) ?? 'direct'}
                      </td>
                      <td style={{ padding: '10px 9px', color: 'var(--text)' }}>{v.visitCount}</td>
                      <td style={{ padding: '10px 9px', color: 'var(--text-muted)' }}>{v.eventCount}</td>
                      <td style={{ padding: '10px 9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(v.firstSeen)} → {timeAgo(v.lastSeen)}</td>
                      <td style={{ padding: '10px 9px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.lastPath ?? undefined}>{v.lastPath ?? '-'}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${v.visitorId}-detail`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={13} style={{ padding: '0 14px 14px 40px', background: 'var(--surface-2)' }}>
                          {timelineLoading === v.visitorId ? (
                            <p style={{ color: 'var(--text-dim)', padding: '10px 0' }}>loading...</p>
                          ) : (
                            <div style={{ maxHeight: '320px', overflowY: 'auto', marginTop: '4px' }}>
                              {(timelines[v.visitorId] ?? []).map((e, i) => (
                                <div key={i} style={{
                                  display: 'flex', gap: '12px', padding: '7px 0',
                                  borderBottom: i < (timelines[v.visitorId]?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none',
                                }}>
                                  <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap', minWidth: '80px' }}>{timeAgo(e.createdAt)}</span>
                                  <ActionCell event={e.event} detail={e.detail} path={e.path} />
                                </div>
                              ))}
                              {(timelines[v.visitorId] ?? []).length === 0 && (
                                <p style={{ color: 'var(--text-dim)', padding: '10px 0' }}>no events</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredVisitors.length === 0 && (
                <tr><td colSpan={13} style={{ padding: '20px 14px', color: 'var(--text-dim)', textAlign: 'center' }}>no visits recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent activity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
          <Activity size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            recent activity (everyone)
          </span>
        </div>
        <div style={{
          overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px',
          background: 'var(--surface)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                {['when', 'visitor', 'ip', 'country', 'action', 'referrer'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(r.createdAt)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>{r.visitorId.slice(0, 8)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{r.ip ?? '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{r.country ?? '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                    <ActionCell event={r.event} detail={r.detail} path={r.path} />
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.referrer ?? '-'}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '20px 14px', color: 'var(--text-dim)', textAlign: 'center' }}>no activity yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>)}
      </div>
    </main>
  );
}
