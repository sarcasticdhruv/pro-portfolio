// Vercel Edge Function: the /watched movies list.
//
//   GET    /api/movies                         -> public, all watched films
//   POST   { key, text }                       -> parse free text + match TMDB,
//                                                 returns a DRAFT, writes nothing
//   POST   { key, movie, confirm: true }       -> insert the (edited) draft
//   DELETE { key, id }                         -> remove one row
//
// Everything except GET is gated behind ADMIN_KEY, the same env var and check
// api/visits.ts uses. Parsing happens here rather than in the browser so the
// prompt, the tag vocabulary and TMDB_API_KEY never enter the client bundle.

import { sql } from '@vercel/postgres';

export const config = { runtime: 'edge' };

// KEEP IN SYNC WITH: src/content/movieTags.mjs (client UI copy).
// This copy is the authority - anything not in this list is dropped on write,
// so the two drifting fails safely rather than polluting the tag data.
const MOVIE_TAGS = [
  'mindboggling',
  'rewatchable',
  'excellent',
  'beautiful',
  'slow-burn',
  'overrated',
  'comfort-watch',
  'technically-brilliant',
  'disappointing',
  'stayed-with-me',
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS movies (
      id          BIGSERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      year        INT,
      tmdb_id     INT,
      poster_url  TEXT,
      tmdb_url    TEXT,
      genres      TEXT[],
      rating      REAL,
      tags        TEXT[],
      review      TEXT,
      watched_on  DATE,
      blog_slug   TEXT,
      status      TEXT NOT NULL DEFAULT 'watched',
      favorite    BOOLEAN NOT NULL DEFAULT false,
      director    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Added after the table's first deployment - safe no-op once applied.
  await sql`ALTER TABLE movies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'watched'`;
  await sql`ALTER TABLE movies ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE movies ADD COLUMN IF NOT EXISTS director TEXT`;
}

type Status = 'watched' | 'watchlist';

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
  status: Status;
  favorite: boolean;
  director: string | null;
}

// ── Step 1: free text -> structured fields, via the existing /api/llm proxy
// (which already owns provider selection, key rotation and fallback).
const PARSE_SYSTEM = `You extract structured data about a film from someone's casual note. The note is either about a film they ALREADY WATCHED, or one they WANT TO WATCH later.

Return ONLY a JSON object, no prose, no markdown fence. Shape:
{"status": "watched"|"watchlist", "title": string, "year": number|null, "rating": number|null, "tags": string[], "review": string|null, "watchedOn": string|null}

Rules:
- status: "watchlist" if the note expresses intent or desire to see it in the future ("want to watch", "should see", "adding X", "need to watch", "on my list", "recommended to me"). "watched" if they describe having seen it, in any tense, or give any opinion or rating. When genuinely ambiguous, prefer "watched" only if there is an opinion or rating present; otherwise "watchlist".
- For "watchlist" entries, rating, review and watchedOn MUST be null and tags MUST be empty - they have not seen it yet, so inventing an opinion would be wrong.
- title: the film's name only, correctly spelled, no year, no extra words.
- year: release year if the note states or clearly implies one, else null.
- rating: 0.5 to 5.0 in 0.5 steps. Convert other scales (8/10 -> 4). null if not stated.
- tags: choose ONLY from this exact list, zero or more, no invented values:
${MOVIE_TAGS.join(', ')}
- review: their actual opinion, lightly cleaned up, in their own voice. Do not invent praise or add words they did not mean. null if they gave no opinion.
- watchedOn: ISO date YYYY-MM-DD if the note says when ("last night", "yesterday"), resolved against today's date given in the user message. null if unstated.`;

async function parseText(origin: string, text: string): Promise<Partial<Draft> | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(`${origin}/api/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'chat',
        stream: false,
        temperature: 0.1,
        maxTokens: 500,
        messages: [
          { role: 'system', content: PARSE_SYSTEM },
          { role: 'user', content: `Today is ${today}.\n\nNote: ${text}` },
        ],
      }),
    });
    if (!r.ok) {
      console.error('movies parse: /api/llm failed', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const raw: string = (await r.json())?.text ?? '';
    // Models sometimes wrap JSON in a fence or add a sentence around it.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('movies parse: no JSON in model output', raw.slice(0, 200));
      return null;
    }
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('movies parse threw:', err);
    return null;
  }
}

// ── Step 2: resolve the poster/genres/link from TMDB
async function lookupTmdb(title: string, year: number | null) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !title) return null;
  try {
    const u = new URL('https://api.themoviedb.org/3/search/movie');
    u.searchParams.set('api_key', apiKey);
    u.searchParams.set('query', title);
    if (year) u.searchParams.set('year', String(year));
    const r = await fetch(u.toString());
    if (!r.ok) {
      console.error('tmdb search failed', r.status);
      return null;
    }
    const hit = (await r.json())?.results?.[0];
    if (!hit) return null;

    // The search endpoint has no crew, so the director needs one more call.
    // Failure here is non-fatal: a missing director is fine, a failed import
    // is not.
    let director: string | null = null;
    try {
      const cr = await fetch(`https://api.themoviedb.org/3/movie/${hit.id}/credits?api_key=${apiKey}`);
      if (cr.ok) {
        const crew = (await cr.json())?.crew ?? [];
        director = crew.find((c: { job?: string }) => c.job === 'Director')?.name ?? null;
      }
    } catch { /* keep null */ }

    return {
      director,
      tmdbId: hit.id as number,
      posterUrl: hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null,
      tmdbUrl: `https://www.themoviedb.org/movie/${hit.id}`,
      year: hit.release_date ? Number(hit.release_date.slice(0, 4)) : year,
      title: (hit.title as string) || title,
      genreIds: (hit.genre_ids ?? []) as number[],
    };
  } catch (err) {
    console.error('tmdb lookup threw:', err);
    return null;
  }
}

// TMDB's movie genre ids are a small fixed set; hardcoding avoids a second
// round trip to /genre/movie/list on every single parse.
const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

function clampRating(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, Math.max(0.5, Math.round(n * 2) / 2));
}

function isoDate(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(new Date(v).getTime()) ? null : v;
}

function rowToMovie(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    title: r.title,
    year: r.year == null ? null : Number(r.year),
    tmdbId: r.tmdb_id == null ? null : Number(r.tmdb_id),
    posterUrl: r.poster_url,
    tmdbUrl: r.tmdb_url,
    genres: r.genres ?? [],
    rating: r.rating == null ? null : Number(r.rating),
    tags: r.tags ?? [],
    review: r.review,
    watchedOn: r.watched_on,
    blogSlug: r.blog_slug,
    status: r.status ?? 'watched',
    favorite: r.favorite === true,
    director: r.director ?? null,
    createdAt: r.created_at,
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (!process.env.POSTGRES_URL) return json({ movies: [], error: 'db not configured' }, 503);

  const origin = new URL(req.url).origin;

  // ── Public read ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      await ensureTable();
      const { rows } = await sql`
        SELECT * FROM movies
        ORDER BY status ASC, watched_on DESC NULLS LAST, created_at DESC
      `;
      return json({ movies: rows.map(rowToMovie) });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
    }
  }

  let body: {
    key?: string; text?: string; movie?: Partial<Draft>; confirm?: boolean; id?: number;
    quickAdd?: boolean; title?: string; year?: number | null;
    rating?: number | null; tags?: string[]; review?: string | null; blogSlug?: string | null;
    status?: Status; suggest?: boolean; favorite?: boolean; toggleFavorite?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  // ── Everything below is admin-only ─────────────────────────────────────
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || body.key !== adminKey) return json({ error: 'unauthorized' }, 401);

  if (req.method === 'DELETE') {
    if (!body.id) return json({ error: 'missing id' }, 400);
    try {
      await sql`DELETE FROM movies WHERE id = ${body.id}`;
      return json({ ok: true });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
    }
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // ── Confirm: write the (possibly hand-edited) draft ────────────────────
  if (body.confirm) {
    const m = body.movie;
    if (!m?.title) return json({ error: 'missing title' }, 400);
    // The client copy of the tag list is only for display; this filter is
    // what actually guarantees the vocabulary stays fixed.
    // The pg driver serializes a JS string[] into a Postgres text[] literal
    // for us; the `as unknown as string` below is only to satisfy the sql
    // template's parameter typing, not a runtime conversion.
    const tags = (Array.isArray(m.tags) ? m.tags : []).filter(t => MOVIE_TAGS.includes(t));
    const genres = Array.isArray(m.genres) ? m.genres : [];
    const status: Status = m.status === 'watchlist' ? 'watchlist' : 'watched';
    try {
      await ensureTable();

      // Upsert, not a plain insert. The common path is: a film sits on the
      // watchlist, you watch it, then you log it - which must PROMOTE the
      // existing row rather than leave the same film listed twice. Matched on
      // tmdb_id when TMDB resolved it, otherwise on case-insensitive title.
      const existing = m.tmdbId
        ? await sql`SELECT id FROM movies WHERE tmdb_id = ${m.tmdbId} LIMIT 1`
        : await sql`SELECT id FROM movies WHERE lower(title) = lower(${m.title}) LIMIT 1`;

      if (existing.rows.length) {
        const { rows } = await sql`
          UPDATE movies SET
            title = ${m.title}, year = ${m.year ?? null},
            tmdb_id = ${m.tmdbId ?? null}, poster_url = ${m.posterUrl ?? null},
            tmdb_url = ${m.tmdbUrl ?? null}, genres = ${genres as unknown as string},
            rating = ${clampRating(m.rating)}, tags = ${tags as unknown as string},
            review = ${m.review ?? null}, watched_on = ${isoDate(m.watchedOn)},
            blog_slug = ${m.blogSlug ?? null}, status = ${status},
            favorite = ${m.favorite === true}, director = ${m.director ?? null}
          WHERE id = ${existing.rows[0].id}
          RETURNING *
        `;
        return json({ movie: rowToMovie(rows[0]), updated: true });
      }

      const { rows } = await sql`
        INSERT INTO movies (title, year, tmdb_id, poster_url, tmdb_url, genres, rating, tags, review, watched_on, blog_slug, status, favorite, director)
        VALUES (
          ${m.title}, ${m.year ?? null}, ${m.tmdbId ?? null}, ${m.posterUrl ?? null},
          ${m.tmdbUrl ?? null}, ${genres as unknown as string},
          ${clampRating(m.rating)}, ${tags as unknown as string},
          ${m.review ?? null}, ${isoDate(m.watchedOn)}, ${m.blogSlug ?? null}, ${status},
          ${m.favorite === true}, ${m.director ?? null}
        )
        RETURNING *
      `;
      return json({ movie: rowToMovie(rows[0]) });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
    }
  }


  // ── Toggle the heart ───────────────────────────────────────────────────
  if (body.toggleFavorite && body.id) {
    try {
      const { rows } = await sql`
        UPDATE movies SET favorite = NOT favorite WHERE id = ${body.id} RETURNING *
      `;
      if (!rows.length) return json({ error: 'not found' }, 404);
      return json({ movie: rowToMovie(rows[0]) });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
    }
  }

  // ── Suggest what to watch next ─────────────────────────────────────────
  // Grounded in the actual rated rows, and told explicitly to avoid anything
  // already in the table - otherwise the top suggestion is usually a film
  // that's already been watched, which is worse than no suggestion.
  if (body.suggest) {
    try {
      await ensureTable();
      const { rows } = await sql`
        SELECT title, year, rating, tags FROM movies
        ORDER BY rating DESC NULLS LAST, created_at DESC LIMIT 120
      `;
      if (rows.length === 0) return json({ suggestions: [], error: 'nothing logged yet to base a suggestion on' }, 422);

      const liked = rows.filter(r => Number(r.rating) >= 4).map(r => `${r.title} (${r.year})`);
      const allTitles = rows.map(r => String(r.title));
      const prompt = `Films this person rated highly: ${liked.slice(0, 40).join('; ') || '(none rated yet)'}.
Films they have ALREADY logged (never suggest any of these): ${allTitles.join('; ')}.

Suggest 5 films they have NOT logged that fit this taste. Return ONLY a JSON array, no prose, no fence:
[{"title": string, "year": number, "why": string}]
"why" must be one specific sentence tying it to their taste, naming a film of theirs where it helps. No generic praise.`;

      const r = await fetch(`${origin}/api/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'synth', stream: false, temperature: 0.7, maxTokens: 700,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) return json({ error: `llm failed: ${r.status}` }, 502);
      const raw: string = (await r.json())?.text ?? '';
      const m = raw.match(/\[[\s\S]*\]/);
      if (!m) return json({ error: 'could not parse suggestions' }, 502);

      const seen = new Set(allTitles.map(t => t.toLowerCase()));
      const suggestions = (JSON.parse(m[0]) as { title: string; year: number; why: string }[])
        // Second line of defence: the model is told not to repeat, but filter
        // anyway rather than trusting it.
        .filter(x => x?.title && !seen.has(String(x.title).toLowerCase()))
        .slice(0, 5);
      return json({ suggestions });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'suggest failed' }, 500);
    }
  }

  // ── Quick add: a known title/year straight to TMDB + insert, no LLM ────
  // Used by the bulk import, where titles are already clean, so paying for a
  // parse per film would be pure waste. Goes through the same upsert, so
  // re-running an import can't double anything up.
  if (body.quickAdd && body.title) {
    try {
      await ensureTable();
      const tmdb = await lookupTmdb(body.title, body.year ?? null);
      const title = tmdb?.title ?? body.title;
      const tmdbId = tmdb?.tmdbId ?? null;

      const existing = tmdbId
        ? await sql`SELECT id FROM movies WHERE tmdb_id = ${tmdbId} LIMIT 1`
        : await sql`SELECT id FROM movies WHERE lower(title) = lower(${title}) LIMIT 1`;
      if (existing.rows.length) return json({ skipped: true, title });

      const genres = (tmdb?.genreIds ?? []).map(id => TMDB_GENRES[id]).filter(Boolean);
      // Seed entries may carry a rating/tags/review; most carry none. Tags are
      // filtered against the vocabulary here too, same as the normal path.
      const qTags = (Array.isArray(body.tags) ? body.tags : []).filter(t => MOVIE_TAGS.includes(t));
      await sql`
        INSERT INTO movies (title, year, tmdb_id, poster_url, tmdb_url, genres, rating, tags, review, blog_slug, status, favorite, director)
        VALUES (
          ${title}, ${tmdb?.year ?? body.year ?? null}, ${tmdbId},
          ${tmdb?.posterUrl ?? null}, ${tmdb?.tmdbUrl ?? null},
          ${genres as unknown as string}, ${clampRating(body.rating)},
          ${qTags as unknown as string}, ${body.review ?? null},
          ${body.blogSlug ?? null}, ${body.status === 'watchlist' ? 'watchlist' : 'watched'},
          ${body.favorite === true}, ${tmdb?.director ?? null}
        )
      `;
      return json({ added: true, title, tmdbMatched: !!tmdb });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'db error' }, 500);
    }
  }

  // ── Draft: parse + TMDB match, no write ────────────────────────────────
  const text = (body.text ?? '').trim();
  if (!text) return json({ error: 'missing text' }, 400);

  const parsed = await parseText(origin, text.slice(0, 1500));
  if (!parsed?.title) return json({ error: 'could not understand that - try naming the film explicitly' }, 422);

  const tmdb = await lookupTmdb(parsed.title, parsed.year ?? null);

  const status: Status = parsed.status === 'watchlist' ? 'watchlist' : 'watched';
  const unseen = status === 'watchlist';

  const draft: Draft = {
    status,
    title: tmdb?.title ?? parsed.title,
    year: tmdb?.year ?? parsed.year ?? null,
    // Enforced here rather than trusted from the model: a film you haven't
    // seen cannot carry a rating, review, tags or a watch date.
    rating: unseen ? null : clampRating(parsed.rating),
    tags: unseen ? [] : (Array.isArray(parsed.tags) ? parsed.tags : []).filter(t => MOVIE_TAGS.includes(t)),
    review: unseen ? null : (parsed.review ?? null),
    watchedOn: unseen ? null : isoDate(parsed.watchedOn),
    blogSlug: null, // suggested client-side against ALL_POSTS, editable in the preview
    tmdbId: tmdb?.tmdbId ?? null,
    posterUrl: tmdb?.posterUrl ?? null,
    tmdbUrl: tmdb?.tmdbUrl ?? null,
    genres: (tmdb?.genreIds ?? []).map(id => TMDB_GENRES[id]).filter(Boolean),
    favorite: false,
    director: tmdb?.director ?? null,
  };

  return json({
    draft,
    // Surfaced so the admin UI can warn instead of silently saving a
    // poster-less row when the key is missing or the film wasn't found.
    tmdbMatched: !!tmdb,
    tmdbConfigured: !!process.env.TMDB_API_KEY,
  });
}
