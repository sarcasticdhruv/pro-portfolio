import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shuffle, Star, Film, ExternalLink, RotateCw } from 'lucide-react';
import type { Movie } from '../../pages/WatchedPage';

// Visitor-facing picker. Deliberately does NOT call an LLM: the ratings, tags
// and reviews are already real, so a generated blurb would be strictly worse
// than showing Dhruv's own words - and this way it's instant and free.
//
// Only recommends films rated 4+ (a "recommendation" that pulls a 2-star film
// isn't a recommendation), and never repeats the film currently on screen.
const MIN_RATING = 4;

// Same fix as WatchedPage's Stars: a whole/empty star is one icon, not two
// stacked layers - stacking a second identical copy on every star (as before)
// left a faint ghost outline from sub-pixel anti-aliasing drift between the
// base and the clipped overlay. Only a half-star needs the second layer.
function Stars({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, value - i));
        if (fill <= 0 || fill >= 1) {
          return (
            <Star key={i} size={13} fill={fill >= 1 ? 'var(--accent)' : 'none'}
              style={{ display: 'block', color: fill >= 1 ? 'var(--accent)' : 'var(--border-2)' }} />
          );
        }
        return (
          <span key={i} style={{ position: 'relative', width: 13, height: 13, display: 'inline-block' }}>
            <Star size={13} style={{ color: 'var(--border-2)', position: 'absolute', inset: 0 }} />
            <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
              <Star size={13} fill="var(--accent)" style={{ color: 'var(--accent)', position: 'absolute', inset: 0 }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default function Recommender({ movies }: { movies: Movie[] }) {
  const [mood, setMood] = useState<string | null>(null);
  const [pick, setPick] = useState<Movie | null>(null);

  const pool = useMemo(
    () => movies.filter(m => m.status !== 'watchlist' && (m.rating ?? 0) >= MIN_RATING),
    [movies],
  );

  // Only offer moods that actually have a qualifying film behind them, so no
  // chip can ever lead to "nothing found".
  const moods = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of pool) for (const t of m.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [pool]);

  function recommend(withMood: string | null = mood) {
    const candidates = withMood ? pool.filter(m => m.tags?.includes(withMood)) : pool;
    const notCurrent = candidates.filter(m => m.id !== pick?.id);
    const from = notCurrent.length ? notCurrent : candidates;
    if (!from.length) { setPick(null); return; }
    setPick(from[Math.floor(Math.random() * from.length)]);
  }

  if (pool.length === 0) return null;

  return (
    <div style={{
      marginBottom: '44px', padding: '20px',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <p className="label" style={{ fontSize: '0.64rem' }}>recommend me one</p>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: 'var(--text-dim)' }}>
          from {pool.length} I rated {MIN_RATING}+
        </span>
      </div>

      {/* Mood filter */}
      {moods.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
          {[null, ...moods].map(t => {
            const on = mood === t;
            return (
              <button
                key={t ?? 'any'}
                onClick={() => { setMood(t); recommend(t); }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
                  padding: '4px 11px', borderRadius: '100px', cursor: 'pointer',
                  background: on ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${on ? 'var(--tag-border)' : 'var(--border)'}`,
                  color: on ? 'var(--accent)' : 'var(--text-dim)',
                }}
              >
                {t ?? 'surprise me'}
              </button>
            );
          })}
        </div>
      )}

      {!pick && (
        <button onClick={() => recommend()} style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          background: 'var(--accent)', color: 'var(--chat-user-text)', border: 'none',
          borderRadius: '7px', padding: '9px 16px', cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', fontWeight: 600,
        }}>
          <Shuffle size={13} /> pick one for me
        </button>
      )}

      {pick && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '104px', aspectRatio: '2/3', flexShrink: 0, borderRadius: '8px',
            overflow: 'hidden', background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {pick.posterUrl
              ? <img src={pick.posterUrl} alt={pick.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Film size={20} style={{ color: 'var(--text-dim)' }} />}
          </div>

          <div style={{ flex: 1, minWidth: '210px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.05rem',
              color: 'var(--text)', lineHeight: 1.25,
            }}>
              {pick.title}
              {pick.year && <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}> ({pick.year})</span>}
            </p>

            {pick.rating != null && <Stars value={pick.rating} />}

            {pick.review
              ? (
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '0.84rem',
                  color: 'var(--text-muted)', lineHeight: 1.6,
                }}>
                  {pick.review}
                </p>
              )
              : (
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)',
                }}>
                  {pick.tags?.length ? pick.tags.join(' · ') : 'no notes on this one yet'}
                </p>
              )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', flexWrap: 'wrap' }}>
              <button onClick={() => recommend()} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: '1px solid var(--border-2)',
                borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
              }}>
                <RotateCw size={11} /> another
              </button>
              {pick.blogSlug && (
                <Link to={`/blog/${pick.blogSlug}`} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
                  color: 'var(--accent)', textDecoration: 'none',
                }}>
                  read the post →
                </Link>
              )}
              {pick.tmdbUrl && (
                <a href={pick.tmdbUrl} target="_blank" rel="noopener noreferrer" title="View on TMDB"
                  style={{ color: 'var(--text-dim)', display: 'flex' }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
