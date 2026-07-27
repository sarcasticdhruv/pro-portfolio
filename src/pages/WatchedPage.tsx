import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Film, ExternalLink } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

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

// ── Stars ─────────────────────────────────────────────────────────────────
// Half-steps are drawn by clipping a filled star to 50% width rather than
// using a separate half-star glyph, so the two halves always align exactly.
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

// ── One horizontal bar ────────────────────────────────────────────────────
// Single-series magnitude, so there is no palette to assign: one accent fill,
// recessive track, value direct-labelled (few enough bars that a tooltip
// would hide information a label can just show).
function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
        color: 'var(--text-dim)', width: '92px', flexShrink: 0,
        textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '10px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: max > 0 ? `${Math.max(2, (count / max) * 100)}%` : '0%',
          height: '100%', background: 'var(--accent)', borderRadius: '4px',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
        color: 'var(--text-muted)', width: '22px', flexShrink: 0,
      }}>
        {count}
      </span>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '18px 20px',
    }}>
      <p className="label" style={{ fontSize: '0.66rem', marginBottom: '14px' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
    </div>
  );
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${String(y).slice(2)}`;
}

export default function WatchedPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useSEO({
    title: 'Watched',
    description: 'Films watched, with personal ratings, tags, and short reviews by Dhruv Choudhary.',
  });

  useEffect(() => {
    // A failing endpoint still returns `{ movies: [] }` alongside an error
    // (e.g. 503 when the DB isn't configured). Checking `d.error` matters:
    // without it the page would render "nothing logged yet" and claim the
    // list is empty when really the database is unreachable.
    fetch('/api/movies')
      .then(r => r.json())
      .then(d => {
        if (d?.error) throw new Error(d.error);
        setMovies(d.movies ?? []);
      })
      .catch(() => setError('could not load'))
      .finally(() => setLoading(false));
  }, []);

  // Charts describe films actually seen. Counting watchlist entries would
  // inflate the genre spread with taste you haven't formed yet.
  const watched = useMemo(() => movies.filter(m => m.status !== 'watchlist'), [movies]);
  const watchlist = useMemo(() => movies.filter(m => m.status === 'watchlist'), [movies]);

  const genreData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of watched) for (const g of m.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [watched]);

  const ratingData = useMemo(() => {
    const steps = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
    return steps
      .map(s => [`${s}`, watched.filter(m => m.rating === s).length] as [string, number])
      .filter(([, c]) => c > 0);
  }, [watched]);

  // Last 12 months, gaps included - a month you watched nothing is real
  // information, so it gets a zero bar rather than being dropped.
  const timeData = useMemo(() => {
    const dated = watched.filter(m => m.watchedOn);
    if (!dated.length) return [];
    const counts = new Map<string, number>();
    for (const m of dated) {
      const ym = m.watchedOn!.slice(0, 7);
      counts.set(ym, (counts.get(ym) ?? 0) + 1);
    }
    const out: [string, number][] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push([monthLabel(ym), counts.get(ym) ?? 0]);
    }
    return out;
  }, [movies]);

  const hasCharts = genreData.length > 0 || ratingData.length > 0 || timeData.length > 0;

  return (
    <main style={{ minHeight: '100vh', paddingTop: '110px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 24px)' }}>

        {/* Header */}
        <div className="page-breadcrumb" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.8rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.05em',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>~/dhruv</Link>
          <span>/</span>
          <span>watched</span>
        </div>

        <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, marginBottom: '6px' }}>
          Watched<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '36px' }}>
          Films I've seen, rated honestly. Some have a few lines, some just a rating.
        </p>

        {loading && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            loading...
          </p>
        )}

        {error && !loading && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {error}
          </p>
        )}

        {!loading && !error && movies.length === 0 && (
          <div style={{
            border: '1px dashed var(--border-2)', borderRadius: '12px',
            padding: '48px 24px', textAlign: 'center',
          }}>
            <Film size={22} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              nothing logged yet.
            </p>
          </div>
        )}

        {/* Poster grid */}
        {movies.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '18px',
            marginBottom: hasCharts ? '56px' : '0',
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
                    : <Film size={22} style={{ color: 'var(--text-dim)' }} />}
                </div>

                <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem',
                    color: 'var(--text)', lineHeight: 1.3,
                  }}>
                    {m.title}
                    {m.year && <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}> ({m.year})</span>}
                  </p>

                  {m.rating != null && <Stars value={m.rating} />}

                  {m.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {m.tags.map(t => (
                        <span key={t} style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
                          color: 'var(--accent)', background: 'var(--accent-glow)',
                          border: '1px solid var(--tag-border)', borderRadius: '100px',
                          padding: '1px 7px',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {m.review && (
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem',
                      color: 'var(--text-muted)', lineHeight: 1.55,
                    }}>
                      {m.review}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                    {m.blogSlug && (
                      <Link to={`/blog/${m.blogSlug}`} style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
                        color: 'var(--accent)', textDecoration: 'none',
                      }}>
                        read the post →
                      </Link>
                    )}
                    {m.tmdbUrl && (
                      <a href={m.tmdbUrl} target="_blank" rel="noopener noreferrer"
                        title="View on TMDB"
                        style={{ marginLeft: 'auto', color: 'var(--text-dim)', display: 'flex' }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Analytics */}
        {hasCharts && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {genreData.length > 0 && (
              <ChartCard title="genres">
                {genreData.map(([g, c]) => (
                  <Bar key={g} label={g} count={c} max={Math.max(...genreData.map(d => d[1]))} />
                ))}
              </ChartCard>
            )}

            {ratingData.length > 0 && (
              <ChartCard title="ratings">
                {ratingData.map(([r, c]) => (
                  <Bar key={r} label={`${r} ★`} count={c} max={Math.max(...ratingData.map(d => d[1]))} />
                ))}
              </ChartCard>
            )}

            {timeData.length > 0 && (
              <ChartCard title="last 12 months">
                {timeData.map(([mo, c]) => (
                  <Bar key={mo} label={mo} count={c} max={Math.max(1, ...timeData.map(d => d[1]))} />
                ))}
              </ChartCard>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
