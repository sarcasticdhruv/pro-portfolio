# Visitor Nature Classification + Admin Panel Enhancements

**Date:** 2026-09-03
**Status:** Approved

## Problem

The admin panel (`/admin`, `src/pages/AdminPage.tsx`) shows raw visitor data (IP, country/city, user agent, referrer, path) but has no way to tell whether a given visit came from a real person, a search-engine crawler, an automated script/tool, or something ambiguous. All traffic is treated the same, making the visitor stats and charts noisy and harder to trust.

## Goals

- Classify every visit into one of four "nature" categories: `human`, `crawler`, `script`, `suspicious`.
- Do this classification for free, with no external API calls or API keys — heuristics only, built from signals already available in the request (User-Agent header, Accept/Accept-Language headers).
- Classify at write time (when a visit is recorded), so reads stay fast and the logic lives in one place.
- Backfill existing historical rows so the admin dashboard is accurate immediately, not just for new traffic.
- Surface the classification in the admin panel: a breakdown stat, a filter, a table column, and a chart — using the existing custom dark-monospace design system (no new UI dependencies).

## Non-goals

- No third-party IP intelligence/fraud-scoring API (rejected in favor of free heuristics; revisit later if accuracy proves insufficient).
- No full redesign of the admin panel's visual language — polish stays within the current inline-style/CSS-variable system.
- No rate limiting or blocking of bot traffic — this is classification/visibility only, not enforcement.
- No changes to the `/watched` page's `MoviesAdmin` surface.

## Design

### 1. Classification engine — `src/lib/visitorNature.ts`

A new, dependency-free module exporting:

```ts
export type VisitorNature = 'human' | 'crawler' | 'script' | 'suspicious';

export function classifyVisitor(
  userAgent: string | null | undefined,
  headers: { acceptLanguage?: string | null; accept?: string | null }
): VisitorNature;
```

Classification runs as an ordered set of checks, high-confidence first:

1. **`script`** — empty/missing UA, or UA matches known tool/script/headless signatures: `curl`, `wget`, `python-requests`, `axios`, `node-fetch`, `Go-http-client`, `PostmanRuntime`, `HeadlessChrome`, `Puppeteer`, `Playwright`, `okhttp`, generic `bot`-in-UA strings not matched by the crawler allowlist below.
2. **`crawler`** — UA matches a known-good crawler allowlist: `Googlebot`, `Bingbot`, `DuckDuckBot`, `Slurp`, `facebookexternalhit`, `Twitterbot`, `LinkedInBot`, `Applebot`, `YandexBot`, etc.
3. **`suspicious`** — doesn't match either list above, but has red flags: missing `Accept-Language` header, missing/generic `Accept` header, or a UA string that's implausibly short/malformed for a real browser.
4. **`human`** — default, when none of the above match.

The list of signatures lives as exported constants in the same file so it's easy to extend later.

This module has no dependency on the Edge/Node runtime split — pure string/header logic — so it can be imported both from `api/track.ts` (Edge) and from a Node-based backfill script.

### 2. Schema change — `visits` table

In `api/track.ts`'s existing `ensureTable()` (which already does idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), add:

```sql
ALTER TABLE visits ADD COLUMN IF NOT EXISTS nature TEXT DEFAULT 'human'
```

### 3. Write path — `api/track.ts`

At the point where a visit/event row is inserted, call `classifyVisitor(userAgent, { acceptLanguage, accept })` using headers already read from the request, and store the result in the new `nature` column.

### 4. Backfill — one-off script

A standalone Node script (e.g. `scripts/backfill-visitor-nature.ts`, run manually once with `POSTGRES_URL` set locally or in CI) that:
- Selects all rows from `visits`.
- Runs `classifyVisitor()` against each row's stored `user_agent` (headers other than UA aren't stored historically, so backfill relies on UA alone — acceptable since UA is the primary signal for `script`/`crawler` detection, and rows lacking language/accept data simply can't retroactively hit the `suspicious` bucket for that reason, only for malformed/short UA).
- Batches `UPDATE` statements to set `nature` per row.
- Is run once by the user after deploy; not wired into any automated pipeline.

### 5. Read path — `api/visits.ts`

- Include `nature` in the per-visitor latest-row aggregate query (so each visitor row in the dashboard carries a nature value).
- Add a `natureBreakdown` object to the response: counts (and percentages) of `human` / `crawler` / `script` / `suspicious` across the queried period.

### 6. Admin UI — `AdminPage.tsx`, `VisitorAnalytics.tsx`, `Charts.tsx`

- **Stat tiles**: add tiles (using existing `StatTile`/`StatRow` primitives from `Charts.tsx`) for each nature category's count/percentage, placed alongside current stats.
- **Nature column**: add a column to the visitor table rendering a colored pill badge (reusing the existing pill-button visual idiom — `borderRadius: 100px`, background tint per category via CSS vars) showing each visitor's nature.
- **Filter**: pill-toggle buttons above the table — "All / Human / Crawler / Script / Suspicious" — matching the existing toggle-button pattern already used elsewhere in the dashboard. Filtering happens client-side over already-fetched data.
- **Breakdown chart**: a horizontal bar chart (reusing `Bar`/`Columns` from `Charts.tsx` — no new charting library) showing nature composition, placed near the existing daily-traffic chart in `VisitorAnalytics.tsx`.
- **Visual polish**: within the current design system only — improve table row spacing/readability, ensure the new filter/stat row wraps sensibly on narrow viewports, align the stat tile row consistently. No new frameworks (no Tailwind/shadcn), no restructuring of the overall page layout.

### Color mapping (pills/chart)

Reuse existing CSS vars where sensible, e.g.:
- `human` → `var(--accent)` (existing green highlight)
- `crawler` → a neutral blue/info tone
- `script` → a warning/amber tone
- `suspicious` → a red/danger tone

Exact hex values chosen during implementation to fit both dark and light theme overrides already defined in `src/index.css`.

## Data flow summary

```
Visit occurs → useVisitTracking fires → POST /api/track
  → api/track.ts reads UA + Accept + Accept-Language headers
  → classifyVisitor() → nature
  → INSERT ... nature into visits table

Admin loads /admin → GET /api/visits?key=...
  → aggregates include nature per visitor + natureBreakdown summary
  → AdminPage.tsx / VisitorAnalytics.tsx render stat tiles, pill column, filter, chart
```

## Testing

- Unit-style manual checks of `classifyVisitor()` against representative UA strings for each of the four categories (can be a small local script or added as a lightweight test if a test runner exists in the project — none was found, so this may be manual verification via `node -e` against sample strings).
- Manual verification in the browser: confirm new visits get classified correctly (check via curl UA vs real browser), confirm admin panel renders the new stat tiles/column/filter/chart correctly in both dark and light themes.
- Backfill script dry-run against a small subset before running against the full table (e.g., `LIMIT`/`SELECT` first to sanity-check classification distribution looks reasonable).

## Open risks / limitations

- Heuristic classification will misclassify sophisticated bots that spoof a real browser's full header set — accepted trade-off per user's explicit choice of free heuristics over a paid/keyed API.
- Historical backfill can't use Accept/Accept-Language signals (not stored historically), so backfilled `suspicious` classifications are based on UA quality alone — slightly less precise than going-forward classification.
