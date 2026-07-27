import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Check, Trash2, Film, AlertTriangle, Upload, Plus, Heart } from 'lucide-react';
import { MOVIE_TAGS } from '../../content/movieTags.mjs';
import { MOVIE_SEED } from '../../content/movieSeed.mjs';
import { ALL_POSTS } from '../../lib/blog';
import type { Movie } from '../../pages/WatchedPage';

interface Draft {
  title: string;
  year: number | null;
  rating: number | null;
  tags: string[];
  review: string | null;
  watchedOn: string | null;
  blogSlug: string | null;
  tmdbId: number | null;
  posterUrl: string | null;
  tmdbUrl: string | null;
  genres: string[];
}

// Suggest an existing blog post for this film. Deliberately conservative:
// only an exact containment match either way, since a loose fuzzy match would
// silently attach the wrong post and the whole point of the preview step is
// that wrong guesses are visible before they're saved.
function suggestBlogSlug(title: string): string | null {
  const t = title.toLowerCase().trim();
  if (t.length < 4) return null;
  const hit = ALL_POSTS.find(p => {
    const pt = p.title.toLowerCase();
    return pt.includes(t) || t.includes(pt);
  });
  return hit?.slug ?? null;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)', border: '1px solid var(--border-2)',
  borderRadius: '7px', padding: '7px 10px', color: 'var(--text)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', outline: 'none',
  width: '100%',
};

export default function MoviesAdmin({ adminKey, onChange }: { adminKey: string; onChange?: () => void }) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tmdbWarning, setTmdbWarning] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, added: 0, skipped: 0, updated: 0, failed: [] as string[] });
  const [overwrite, setOverwrite] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; year: number; why: string }[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  async function suggest() {
    if (suggesting) return;
    setSuggesting(true);
    setErr('');
    try {
      const res = await fetch('/api/movies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, suggest: true }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d?.error ?? 'suggest failed');
      setSuggestions(d.suggestions ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'suggest failed');
    } finally {
      setSuggesting(false);
    }
  }

  // Accepted suggestions land on the WATCHLIST, not as watched - they haven't
  // been seen, so they must carry no rating or review.
  async function addToWatchlist(s: { title: string; year: number }) {
    setAdding(s.title);
    try {
      await fetch('/api/movies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, quickAdd: true, title: s.title, year: s.year, status: 'watchlist' }),
      });
      setSuggestions(prev => prev.filter(x => x.title !== s.title));
      loadMovies();
    } catch {
      setErr('could not add');
    } finally {
      setAdding(null);
    }
  }

  // Sequential on purpose: 131 parallel TMDB lookups would rate-limit, and
  // this runs once. Skips are expected and fine - the server upserts, so a
  // re-run after a half-finished import just resumes.
  async function bulkImport() {
    if (importing) return;
    setImporting(true);
    setErr('');
    const p = { done: 0, added: 0, skipped: 0, updated: 0, failed: [] as string[] };
    setProgress({ ...p });
    for (const m of MOVIE_SEED) {
      try {
        const res = await fetch('/api/movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: adminKey, quickAdd: true, title: m.title, year: m.year,
            rating: m.rating ?? null, tags: m.tags ?? [],
            review: m.review ?? null, blogSlug: m.blogSlug ?? null,
            favorite: m.favorite === true, overwrite,
          }),
        });
        const d = await res.json();
        if (!res.ok || d.error) p.failed.push(m.title);
        else if (d.skipped) p.skipped++;
        else if (d.updated) p.updated++;
        else p.added++;
      } catch {
        p.failed.push(m.title);
      }
      p.done++;
      setProgress({ ...p });
    }
    setImporting(false);
    loadMovies();
  }

  function loadMovies() {
    fetch('/api/movies').then(r => r.json()).then(d => setMovies(d.movies ?? [])).catch(() => {});
    onChange?.();
  }
  useEffect(loadMovies, []);

  async function parse() {
    if (!text.trim() || parsing) return;
    setParsing(true);
    setErr('');
    setDraft(null);
    setTmdbWarning('');
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'parse failed');
      const d: Draft = data.draft;
      d.blogSlug = suggestBlogSlug(d.title);
      setDraft(d);
      if (!data.tmdbConfigured) setTmdbWarning('TMDB_API_KEY is not set — saving without a poster.');
      else if (!data.tmdbMatched) setTmdbWarning('No TMDB match — check the title, or save without a poster.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'parse failed');
    } finally {
      setParsing(false);
    }
  }

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setErr('');
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, movie: draft, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'save failed');
      setDraft(null);
      setText('');
      setTmdbWarning('');
      loadMovies();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFav(id: number) {
    try {
      await fetch('/api/movies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, toggleFavorite: true, id }),
      });
      loadMovies();
    } catch {
      setErr('could not update');
    }
  }

  async function remove(id: number) {
    try {
      await fetch('/api/movies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey, id }),
      });
      loadMovies();
    } catch {
      setErr('delete failed');
    }
  }

  function patch(p: Partial<Draft>) {
    setDraft(d => (d ? { ...d, ...p } : d));
  }

  return (
    <div>
      {/* Input */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="watched Barry Lyndon last night, 5 stars, mindboggling, every frame is a painting"
        rows={3}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, marginBottom: '10px' }}
      />
      <button
        onClick={parse}
        disabled={parsing || !text.trim()}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          background: 'var(--accent)', color: 'var(--chat-user-text)',
          border: 'none', borderRadius: '7px', padding: '9px 16px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', fontWeight: 600,
          cursor: parsing || !text.trim() ? 'default' : 'pointer',
          opacity: parsing || !text.trim() ? 0.6 : 1,
        }}
      >
        {parsing ? <Loader2 size={13} className="spin-slow" /> : <Sparkles size={13} />}
        {parsing ? 'parsing...' : 'parse'}
      </button>

      {err && (
        <p style={{ color: '#FF6B6B', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', marginTop: '10px' }}>
          {err}
        </p>
      )}

      {/* Preview / edit before writing */}
      {draft && (
        <div style={{
          marginTop: '18px', background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap',
        }}>
          <div style={{
            width: '110px', aspectRatio: '2/3', flexShrink: 0, borderRadius: '8px',
            overflow: 'hidden', background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {draft.posterUrl
              ? <img src={draft.posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Film size={20} style={{ color: 'var(--text-dim)' }} />}
          </div>

          <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {tmdbWarning && (
              <p style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: '#d99a2b',
              }}>
                <AlertTriangle size={12} /> {tmdbWarning}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={draft.title} onChange={e => patch({ title: e.target.value })}
                placeholder="title" style={{ ...inputStyle, flex: 1 }} />
              <input value={draft.year ?? ''} onChange={e => patch({ year: e.target.value ? Number(e.target.value) : null })}
                placeholder="year" style={{ ...inputStyle, width: '76px' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={draft.rating ?? ''} type="number" step="0.5" min="0.5" max="5"
                onChange={e => patch({ rating: e.target.value ? Number(e.target.value) : null })}
                placeholder="rating" style={{ ...inputStyle, width: '90px' }} />
              <input value={draft.watchedOn ?? ''} type="date"
                onChange={e => patch({ watchedOn: e.target.value || null })}
                style={{ ...inputStyle, flex: 1 }} />
            </div>

            {/* Fixed vocabulary — the server filters anything not in this list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {MOVIE_TAGS.map(t => {
                const on = draft.tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => patch({ tags: on ? draft.tags.filter(x => x !== t) : [...draft.tags, t] })}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
                      padding: '3px 9px', borderRadius: '100px', cursor: 'pointer',
                      background: on ? 'var(--accent-glow)' : 'transparent',
                      border: `1px solid ${on ? 'var(--tag-border)' : 'var(--border)'}`,
                      color: on ? 'var(--accent)' : 'var(--text-dim)',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <textarea value={draft.review ?? ''} onChange={e => patch({ review: e.target.value || null })}
              placeholder="review (optional)" rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />

            <select
              value={draft.blogSlug ?? ''}
              onChange={e => patch({ blogSlug: e.target.value || null })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">no linked blog post</option>
              {ALL_POSTS.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>

            {draft.genres.length > 0 && (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.64rem', color: 'var(--text-dim)' }}>
                genres: {draft.genres.join(', ')}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              <button
                onClick={save}
                disabled={saving || !draft.title.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'var(--accent)', color: 'var(--chat-user-text)',
                  border: 'none', borderRadius: '7px', padding: '8px 15px',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? <Loader2 size={12} className="spin-slow" /> : <Check size={12} />}
                {saving ? 'saving...' : 'save'}
              </button>
              <button
                onClick={() => { setDraft(null); setTmdbWarning(''); }}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: '7px', padding: '8px 15px', color: 'var(--text-dim)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', cursor: 'pointer',
                }}
              >
                discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* What to watch next */}
      <div style={{ marginTop: '28px' }}>
        <button
          onClick={suggest}
          disabled={suggesting}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: 'transparent', border: '1px solid var(--border-2)',
            borderRadius: '7px', padding: '8px 14px', color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem',
            cursor: suggesting ? 'default' : 'pointer', opacity: suggesting ? 0.6 : 1,
          }}
        >
          {suggesting && <Loader2 size={12} className="spin-slow" />}
          {suggesting ? 'thinking...' : 'what should I watch next'}
        </button>

        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {suggestions.map(s => (
              <div key={s.title} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 13px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                    {s.title} <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>({s.year})</span>
                  </p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', lineHeight: 1.5, marginTop: '3px' }}>
                    {s.why}
                  </p>
                </div>
                <button
                  onClick={() => addToWatchlist(s)}
                  disabled={adding === s.title}
                  title="add to watchlist"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
                    background: 'transparent', border: '1px solid var(--border-2)',
                    borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: 'var(--accent)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem',
                  }}
                >
                  {adding === s.title ? <Loader2 size={10} className="spin-slow" /> : <Plus size={10} />}
                  watchlist
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk import of the transcribed library list */}
      <div style={{
        marginTop: '28px', padding: '14px 16px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={bulkImport}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'transparent', border: '1px solid var(--border-2)',
              borderRadius: '7px', padding: '8px 14px', color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem',
              cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? <Loader2 size={12} className="spin-slow" /> : <Upload size={12} />}
            import {MOVIE_SEED.length} from library list
          </button>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)',
          }}>
            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
            update rows that already exist
          </label>
          {(importing || progress.done > 0) && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {progress.done}/{MOVIE_SEED.length} · {progress.added} added · {progress.updated} updated · {progress.skipped} skipped
              {progress.failed.length > 0 && ` · ${progress.failed.length} failed`}
            </span>
          )}
        </div>
        {!importing && progress.failed.length > 0 && (
          <p style={{
            marginTop: '8px', fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.66rem', color: '#d99a2b', lineHeight: 1.6,
          }}>
            failed: {progress.failed.join(', ')}
          </p>
        )}
      </div>

      {/* Existing rows */}
      <p className="label" style={{ fontSize: '0.66rem', margin: '30px 0 10px' }}>
        {movies.length} logged
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {movies.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
            borderRadius: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem',
          }}>
            <span style={{ color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.title}{m.year ? ` (${m.year})` : ''}
            </span>
            <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{m.rating ?? '—'}</span>
            <button onClick={() => toggleFav(m.id)} title={m.favorite ? 'unfavourite' : 'favourite'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '3px',
                color: m.favorite ? '#ff6b81' : 'var(--text-dim)' }}>
              <Heart size={12} fill={m.favorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => remove(m.id)} title="delete"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', padding: '3px' }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
