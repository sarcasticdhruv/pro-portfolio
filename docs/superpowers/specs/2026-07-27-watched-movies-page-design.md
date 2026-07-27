# Watched (Movies) Page — Design

**Date:** 2026-07-27
**Status:** Approved by user (entry point, Postgres storage, admin-LLM flow, analytics all confirmed)

## Goal

Add a `/watched` page listing films watched, each with a poster, a personal
rating, personal tags, and an optional short review, plus three charts over
that data. Films are added through a passcode-gated admin panel where free
text ("watched Barry Lyndon last night, 5 stars, mindboggling, every frame is
a painting") is parsed by an LLM into structured fields, matched against TMDB
for the poster, previewed, and then written to Postgres so it appears
immediately.

The page is reachable by URL directly and, as an easter egg, by
double-clicking the `~/dhruv` breadcrumb on any subpage.

## Constraints and existing machinery to reuse

This adds far less new infrastructure than it appears, because four pieces
already exist and are proven in production:

- **Edge functions + Postgres work on Vercel.** Verified live during design:
  `GET /api/visits` with no key returns `401 {"error":"unauthorized"}` as JSON
  (the function executing and checking `ADMIN_KEY`), while an unmapped
  `/api/*` path returns Vercel's plain-text 404. `vercel.json`'s SPA rewrite
  already excludes `/api/` precisely so functions resolve.
- **Admin auth pattern** — `api/visits.ts` compares `?key=` against the
  `ADMIN_KEY` env var; `src/pages/AdminPage.tsx` owns the passcode form and
  reuses a verified key from `sessionStorage` under `admin_key`.
- **Idempotent table creation** — `api/track.ts`'s `ensureTable()` runs
  `CREATE TABLE IF NOT EXISTS` plus `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  on write. Mirror this exactly; no migration step.
- **LLM calls with key rotation and fallback** — `api/llm.ts` already owns
  provider selection, key rotation, and fallback across Groq/HF/Cerebras/
  Gemini. The new endpoint calls it rather than reimplementing any of that.

Also reuse: `json()` helper shape, `export const config = { runtime: 'edge' }`,
and graceful degradation when `POSTGRES_URL` is unset (never break the site).

## Entry point

`~/dhruv` is currently duplicated as a bare `<Link to="/">` in four files:
`GamesPage.tsx:54`, `BlogListPage.tsx:36`, `ImaginePage.tsx:170`,
`SearchPage.tsx:188`. Extract one component rather than paste click logic four
times.

**New `src/components/Breadcrumb.tsx`** — props `{ current: string }`, renders
the existing `page-breadcrumb` markup (`~/dhruv / <current>`) with identical
styling, and owns the click behaviour:

- `onClick` calls `preventDefault()` and starts a ~250ms timer.
- Timer expires with one click → `navigate('/')`.
- A second click inside the window → cancel timer → `navigate('/watched')`.

**Accepted tradeoff:** single- and double-click on one element inherently
conflict, since the first click would otherwise navigate away before the
second lands. The timer is the only fix, and it delays every normal "go home"
click by 250ms across all four pages. The user accepted this cost.

The homepage has no breadcrumb, so the easter egg works from `/blog`,
`/games`, `/search`, and `/imagine` only. `/watched` remains directly
reachable by URL, so discovery is a bonus rather than the sole path in.

## Data model — `movies` table

```sql
CREATE TABLE IF NOT EXISTS movies (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  year        INT,
  tmdb_id     INT,
  poster_url  TEXT,
  tmdb_url    TEXT,
  genres      TEXT[],
  rating      REAL,          -- 0.5–5.0 in 0.5 steps
  tags        TEXT[],        -- fixed vocabulary, see below
  review      TEXT,          -- optional, usually 2–3 lines
  watched_on  DATE,
  blog_slug   TEXT,          -- optional link to an existing post
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`blog_slug` links a film to writing that already exists —
`content/blog/barry-lyndon.md` and `content/blog/last-months-watchlist.md`
are immediate candidates. When set, the card links to `/blog/<slug>`.

It is populated as a **suggestion during parse, confirmed in the preview**:
the parse step fuzzy-matches the resolved film title against published post
titles from `src/lib/blog.ts`'s `ALL_POSTS`, pre-fills `blog_slug` on a
confident match, and leaves it empty otherwise. It is an editable field in
the preview card, so a wrong or missing guess is corrected before the write.

**Tag vocabulary** (fixed; the LLM must choose only from this list, and the
list lives server-side in the parse prompt):

`mindboggling`, `rewatchable`, `excellent`, `beautiful`, `slow-burn`,
`overrated`, `comfort-watch`, `technically-brilliant`, `disappointing`,
`stayed-with-me`

## API — `api/movies.ts` (new edge function)

| Call | Auth | Behaviour |
|---|---|---|
| `GET /api/movies` | public | Returns all rows for the page, newest first |
| `POST {key, text}` | `ADMIN_KEY` | Parse + TMDB match, **returns a draft, writes nothing** |
| `POST {key, movie, confirm:true}` | `ADMIN_KEY` | `ensureTable()` then INSERT, returns the saved row |
| `DELETE {key, id}` | `ADMIN_KEY` | Deletes one row, so mistakes are fixable without touching the DB |

Parsing runs server-side so the prompt, the tag vocabulary, and the TMDB key
never enter the browser bundle. The parse step calls the existing `/api/llm`
by absolute same-origin URL (inheriting its rotation and fallback), instructs
strict JSON output, and constrains `tags` to the fixed list.

TMDB requires a free non-commercial API key stored as `TMDB_API_KEY` in Vercel
env (server-side, never `VITE_`-prefixed). Search by parsed title and year;
store `poster_url`, `tmdb_url`, `tmdb_id`, and `genres` on the row so the page
never calls TMDB at read time.

## Admin flow

Add a **movies tab to the existing `/admin` page** rather than build new auth,
since `AdminPage.tsx` already owns the passcode form, the `sessionStorage`
reuse, and 401 handling.

```
textarea (free text)
  → POST /api/movies {key, text}        parse + TMDB match, no write
  → PREVIEW CARD: poster, matched title/year, rating, tags, review — editable
  → POST /api/movies {key, movie, confirm:true}   → INSERT → live immediately
```

**The preview step is deliberate, not friction for its own sake.** Fully
automatic writing is unsafe here on two independent axes: the LLM can misread
a rating or invent a field, and TMDB frequently matches the wrong film on
remakes and shared titles (three separate films are called *Dune*). Rendering
the matched poster before the write catches both failure modes in one glance,
costs one click, and keeps the result realtime.

## `/watched` page

New `src/pages/WatchedPage.tsx`, routed at `/watched` in `src/router.tsx`,
using the new `Breadcrumb` with `current="watched"`. Fetches
`GET /api/movies` on mount.

- **Poster grid** of film cards: poster, title/year, star rating, tag pills,
  review text, and a link to `/blog/<slug>` when `blog_slug` is set.
- **Three charts** — genre breakdown, rating distribution, and watched over
  time. (No "top stats" counter row; the user explicitly did not select it.)

Build the charts with the `dataviz` skill and the layout with the design/taste
skills, per the user's request to follow the app's existing look.

Empty state matters: the table starts empty, so the page must read as
intentional with zero rows rather than broken.

## SEO / GEO

Index the page: add `/watched` to `scripts/generate-sitemap.mjs`'s
`staticRoutes` and to `scripts/generate-llms-txt.mjs`'s site list, and give it
a route entry in `scripts/prerender.mjs`.

Unlike every other prerendered route, this one's content lives in Postgres
rather than in the repo, so `prerender.mjs` must fetch rows at build time.
`POSTGRES_URL` is available during Vercel builds. **If the query fails or the
DB is unreachable, prerender must emit the page with meta and JSON-LD only and
continue** — a database hiccup must never fail the whole build. Schema:
`CollectionPage`.

## Verification

1. `npm run build` passes, and `dist/watched/index.html` contains a
   route-specific title, description, and JSON-LD.
2. With the DB unreachable at build time, the build still succeeds and emits
   the meta-only page (deliberately test this failure path).
3. `GET /api/movies` returns JSON; `POST` without a key returns 401 — same
   check already proven against `/api/visits`.
4. Full admin round trip against the real deployment: type free text, confirm
   the preview shows the correct poster, save, and see the row appear on
   `/watched`. Then delete it and confirm it disappears.
5. Double-click `~/dhruv` from each of `/blog`, `/games`, `/search`,
   `/imagine` reaches `/watched`; single click still goes home from all four.
6. Playwright smoke test over `/watched` and `/admin` for console errors, as
   done in previous rounds.

## Decisions made on the user's behalf

These were proposed and approved as a batch; revisit any of them freely:

- Preview/confirm step instead of fully automatic insertion (reasoning above).
- The starter tag vocabulary listed above.
- Indexing the page rather than keeping it an unlisted secret.
- 0.5–5 star rating scale alongside the personal tags.
