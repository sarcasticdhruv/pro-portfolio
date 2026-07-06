import { useEffect, useState } from 'react';
import { Lock, RotateCw, Users, Activity } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

const SESSION_KEY = 'admin_key';

interface VisitorRow {
  visitorId: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  lastPath: string | null;
  lastReferrer: string | null;
  lastSeen: string;
  firstSeen: string;
  visitCount: number;
}

interface RecentRow {
  visitorId: string;
  ip: string | null;
  country: string | null;
  path: string | null;
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

export default function AdminPage() {
  useSEO({ title: 'Admin', noindex: true });

  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [fetchError, setFetchError] = useState('');

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
      setAuthed(true);
      sessionStorage.setItem(SESSION_KEY, k);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
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
            Visitors<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <button
            onClick={() => void load(key)}
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

        {/* Visitors table */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
          <Users size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {visitors.length} known visitor{visitors.length === 1 ? '' : 's'}
          </span>
        </div>
        <div style={{
          overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px',
          marginBottom: '36px', background: 'var(--surface)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                {['visitor', 'ip', 'location', 'device', 'visits', 'first seen', 'last seen', 'last page'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.map(v => (
                <tr key={v.visitorId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>{v.visitorId.slice(0, 8)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{v.ip ?? '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                    {[v.city, v.country].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{parseUA(v.userAgent)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{v.visitCount}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(v.firstSeen)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(v.lastSeen)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{v.lastPath ?? '-'}</td>
                </tr>
              ))}
              {visitors.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '20px 14px', color: 'var(--text-dim)', textAlign: 'center' }}>no visits recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent activity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
          <Activity size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            recent activity
          </span>
        </div>
        <div style={{
          overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px',
          background: 'var(--surface)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                {['when', 'visitor', 'ip', 'country', 'page', 'referrer'].map(h => (
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
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{r.path ?? '-'}</td>
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
      </div>
    </main>
  );
}
