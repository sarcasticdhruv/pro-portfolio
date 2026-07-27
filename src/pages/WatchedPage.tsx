import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Film, ExternalLink, Lock, X, Bookmark } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import MoviesAdmin from '../components/admin/MoviesAdmin';
import Recommender from '../components/movies/Recommender';
import { Bar, Columns, ChartCard, StatTile, StatRow, ChartGrid, topCounts } from '../components/charts/Charts';

const SESSION_KEY = 'admin_key';

export interface Movie {
  id: number;
  title: string;
  year: number | null;
  tmdbId: number | null;
  posterUrl: string | null;
  tmdbUrl: string | null;
  genres: string[];
  rating: number | null;
  tags: string[];
  review: string | null;
  watchedOn: string | null;
  blogSlug: string | null;
  status: 'watched' | 'watchlist';
}

// Half-steps are drawn by clipping a filled star to 50% width rather than
// using a separate half-star glyph, so the halves always align exactly.
function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
            <Star size={size} style={{ color: 'var(--border-2)', position: 'absolute', inset: 0 }} />
            {fill > 0 && (
              <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                <Star size={size} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function WatchedPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin unlock, reusing the same ADMIN_KEY + sessionStorage slot as /admin,
  // so unlocking one unlocks the other for the session.
  const [showLock, setShowLock] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [lockErr, setLockErr] = useState('');
  const [checking, setChecking] = useState(false);

  useSEO({
    title: 'Watched',
    description: 'Films watched, with personal ratings, tags, and short reviews by Dhruv Choudhary.',
  });

  function load() {
    // A failing endpoint still returns `{ movies: [] }` alongside an error
    // (503 when the DB isn't configured). Without checking `d.error` the page
    // would claim the list is empty when the database is actually unreachable.
    fetch('/api/movies')
      .then(r => r.json())
      .then(d => {
        if (d?.error) throw new Error(d.error);
        setMovies(d.movies ?? []);
      })
      .catch(() => setError('could not load'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // Re-use a key already verified this session (e.g. from /admin).
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) setAdminKey(saved);
  }, []);

  // Validated against /api/visits because that endpoint already 401s on a bad
  // ADMIN_KEY - no need for a second auth endpoint.
  async function unlock() {
    if (checking || !keyInput.trim()) return;
    setChecking(true);
    setLockErr('');
    try {
      const res = await fetch(`/api/visits?key=${encodeURIComponent(keyInput)}`);
      if (res.status === 401) { setLockErr('wrong key'); return; }
      sessionStorage.setItem(SESSION_KEY, keyInput);
      setAdminKey(keyInput);
      setShowLock(false);
      setKeyInput('');
    } catch {
      setLockErr('could not verify');
    } finally {
      setChecking(false);
    }
  }

  const watched = useMemo(() => movies.filter(m => m.status !== 'watchlist'), [movies]);
  const watchlist = useMemo(() => movies.filter(m => m.status === 'watchlist'), [movies]);

  // Analytics describe films actually SEEN. Counting watchlist entries would
  // inflate the genre spread with taste not yet formed.
  const rated = watched.filter(m => m.rating != null);
  const avgRating = rated.length
    ? (rated.reduce((s, m) => s + (m.rating ?? 0), 0) / rated.length).toFixed(2)
    : '—';

  const genreData = useMemo(() => topCounts(watched.flatMap(m => m.genres ?? []), 10), [watched]);
  const tagData = useMemo(() => topCounts(watched.flatMap(m => m.tags ?? []), 10), [watched]);

  const decadeData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of watched) {
      if (!m.year) continue;
      const d = `${Math.floor(m.year / 10) * 10}s`;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [watched]);

  const ratingData = useMemo(() => {
    const steps = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
    return steps
      .map(s => [`${s} ★`, watched.filter(m => m.rating === s).length] as [string, number])
      .filter(([, c]) => c > 0);
  }, [watched]);

  // 12 months with gaps included - a month with nothing watched is real
  // information, so it gets a zero column instead of being dropped.
  const timeData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of watched) {
      if (m.watchedOn) counts.set(m.watchedOn.slice(0, 7), (counts.get(m.watchedOn.slice(0, 7)) ?? 0) + 1);
    }
    if (counts.size === 0) return [];
    const out: [string, number][] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push([MONTHS[d.getMonth()], counts.get(monthKey(d)) ?? 0]);
    }
    return out;
  }, [watched]);

  const topDecade = decadeData.length
    ? decadeData.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : '—';
  const thisYear = watched.filter(m => m.watchedOn?.startsWith(String(new Date().getFullYear()))).length;
  const hasCharts = watched.length > 0;

  return (
    <main style={{ minHeight: '100vh', paddingTop: '110px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 24px)' }}>

        <div className="page-breadcrumb" style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem',
          color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>~/dhruv</Link>
          <span>/</span>
          <span>watched</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, marginBottom: '6px' }}>
              Watched<span style={{ color: 'var(--accent)' }}>.</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
              Films I've seen, rated honestly. Some have a few lines, some just a rating.
            </p>
          </div>
          <button
            onClick={() => (adminKey ? setAdminKey('') : setShowLock(v => !v))}
            title={adminKey ? 'lock' : 'manage'}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '7px 9px', cursor: 'pointer', flexShrink: 0,
              color: adminKey ? 'var(--accent)' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {adminKey ? <X size={13} /> : <Lock size={13} />}
          </button>
        </div>

        {/* Passcode prompt */}
        {showLock && !adminKey && (
          <form
            onSubmit={e => { e.preventDefault(); void unlock(); }}
            style={{
              display: 'flex', gap: '8px', marginBottom: '28px', maxWidth: '340px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="password" autoFocus value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="admin key"
              style={{
                flex: 1, minWidth: '160px', background: 'var(--surface-2)',
                border: '1px solid var(--border-2)', borderRadius: '7px',
                padding: '8px 11px', color: 'var(--text)', outline: 'none',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem',
              }}
            />
            <button type="submit" disabled={checking || !keyInput.trim()} style={{
              background: 'var(--accent)', color: 'var(--chat-user-text)', border: 'none',
              borderRadius: '7px', padding: '8px 15px', cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', fontWeight: 600,
              opacity: checking || !keyInput.trim() ? 0.6 : 1,
            }}>
              {checking ? 'checking...' : 'unlock'}
            </button>
            {lockErr && (
              <p style={{ color: '#FF6B6B', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', width: '100%' }}>
                {lockErr}
              </p>
            )}
          </form>
        )}

        {/* Management panel (admin only) */}
        {adminKey && (
          <div style={{
            marginBottom: '40px', padding: '18px', borderRadius: '12px',
            background: 'var(--surface-2)', border: '1px dashed var(--border-2)',
          }}>
            <p className="label" style={{ fontSize: '0.64rem', marginBottom: '14px' }}>manage</p>
            <MoviesAdmin adminKey={adminKey} onChange={load} />
          </div>
        )}

        {loading && <Muted>loading...</Muted>}
        {error && !loading && <Muted>{error}</Muted>}

        {!loading && !error && movies.length === 0 && (
          <div style={{ border: '1px dashed var(--border-2)', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
            <Film size={22} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
            <Muted>nothing logged yet.</Muted>
          </div>
        )}

        {/* Visitor-facing picker, from his own rated films */}
        {watched.length > 0 && <Recommender movies={watched} />}

        {/* Stats + analytics, public */}
        {hasCharts && (
          <div style={{ marginBottom: '44px' }}>
            <StatRow>
              <StatTile value={watched.length} label="films watched" />
              <StatTile value={avgRating} label="avg rating" />
              <StatTile value={genreData.length} label="genres" />
              <StatTile value={topDecade} label="top decade" />
              {thisYear > 0 && <StatTile value={thisYear} label="this year" />}
              {watchlist.length > 0 && <StatTile value={watchlist.length} label="watchlist" />}
            </StatRow>

            <ChartGrid>
              {genreData.length > 0 && (
                <ChartCard title="genres">
                  {genreData.map(([g, c]) => (
                    <Bar key={g} label={g} count={c} max={genreData[0][1]} />
                  ))}
                </ChartCard>
              )}
              {ratingData.length > 0 && (
                <ChartCard title="my ratings" note={`${rated.length} rated`}>
                  {ratingData.map(([r, c]) => (
                    <Bar key={r} label={r} count={c} labelWidth="52px"
                      max={Math.max(...ratingData.map(x => x[1]))} />
                  ))}
                </ChartCard>
              )}
              {tagData.length > 0 && (
                <ChartCard title="how they felt">
                  {tagData.map(([t, c]) => (
                    <Bar key={t} label={t} count={c} labelWidth="132px" max={tagData[0][1]} />
                  ))}
                </ChartCard>
              )}
              {decadeData.length > 0 && (
                <ChartCard title="release decade">
                  {decadeData.map(([d, c]) => (
                    <Bar key={d} label={d} count={c} labelWidth="46px"
                      max={Math.max(...decadeData.map(x => x[1]))} />
                  ))}
                </ChartCard>
              )}
              {timeData.length > 0 && (
                <ChartCard title="last 12 months" wide>
                  <Columns data={timeData} height={90} />
                </ChartCard>
              )}
            </ChartGrid>
          </div>
        )}

        {/* Watched grid */}
        {watched.length > 0 && <Grid movies={watched} />}

        {/* Watchlist - posters only, since nothing is rated yet */}
        {watchlist.length > 0 && (
          <div style={{ marginTop: '52px' }}>
            <p className="label" style={{ fontSize: '0.66rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Bookmark size={12} /> watchlist · {watchlist.length}
            </p>
            <Grid movies={watchlist} compact />
          </div>
        )}
      </div>
    </main>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-dim)' }}>
      {children}
    </p>
  );
}

function Grid({ movies, compact }: { movies: Movie[]; compact?: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 120 : 158}px, 1fr))`,
      gap: compact ? '12px' : '18px',
    }}>
      {movies.map(m => (
        <article key={m.id} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            aspectRatio: '2/3', background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {m.posterUrl
              ? <img src={m.posterUrl} alt={m.title} loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <Film size={20} style={{ color: 'var(--text-dim)' }} />}
          </div>

          <div style={{ padding: compact ? '9px 10px' : '12px 13px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              fontSize: compact ? '0.78rem' : '0.85rem', color: 'var(--text)', lineHeight: 1.3,
            }}>
              {m.title}
              {m.year && <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}> ({m.year})</span>}
            </p>

            {m.rating != null && <Stars value={m.rating} />}

            {m.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {m.tags.map(t => (
                  <span key={t} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem',
                    color: 'var(--accent)', background: 'var(--accent-glow)',
                    border: '1px solid var(--tag-border)', borderRadius: '100px', padding: '1px 7px',
                  }}>{t}</span>
                ))}
              </div>
            )}

            {m.review && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem',
                color: 'var(--text-muted)', lineHeight: 1.55,
              }}>
                {m.review}
              </p>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
              {m.blogSlug && (
                <Link to={`/blog/${m.blogSlug}`} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
                  color: 'var(--accent)', textDecoration: 'none',
                }}>
                  read the post →
                </Link>
              )}
              {m.tmdbUrl && (
                <a href={m.tmdbUrl} target="_blank" rel="noopener noreferrer" title="View on TMDB"
                  style={{ marginLeft: 'auto', color: 'var(--text-dim)', display: 'flex' }}>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
