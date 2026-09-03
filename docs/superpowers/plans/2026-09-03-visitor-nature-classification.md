# Visitor Nature Classification + Admin Panel Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify every recorded visit as `human`, `crawler`, `script`, or `suspicious` using free header-based heuristics, store it on the `visits` table, backfill historical rows, and surface the breakdown in the `/admin` dashboard via a stat row, table column, filter, and chart.

**Architecture:** A new dependency-free classifier module (`src/lib/visitorNature.ts`) is called from the Edge write path (`api/track.ts`) at insert time and from a one-off Node backfill script. The read path (`api/visits.ts`) includes `nature` in its query output plus a `natureBreakdown` summary. The React admin UI (`AdminPage.tsx`, `VisitorAnalytics.tsx`) renders the new data using existing chart/pill primitives — no new UI dependencies.

**Tech Stack:** TypeScript, React 18, Vercel Edge Functions, `@vercel/postgres` (raw SQL, no ORM), plain ESM `.mjs` for the standalone backfill script (matches `scripts/generate-sitemap.mjs` convention).

## Global Constraints

- No external API calls or API keys for classification — heuristics only, built from the `User-Agent`, `Accept`, and `Accept-Language` headers already available on the request.
- No new npm dependencies for classification or charting — reuse `Bar`/`Columns`/`ChartCard`/`StatTile`/`StatRow`/`ChartGrid` from `src/components/charts/Charts.tsx`.
- No new UI framework — stay within the existing inline-`style` + CSS custom-property system (`src/index.css`), matching the current dark-monospace visual idiom (pill buttons `borderRadius: '100px'`, cards `border-radius: 12px`, `1px solid var(--border)`, `'JetBrains Mono', monospace` for data/labels).
- Schema changes go through the existing idempotent `ensureTable()` pattern in `api/track.ts` (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) — no separate migration tool.
- The classifier module must be usable from both the Edge runtime (`api/track.ts`) and plain Node (backfill script) — pure string/header logic, no runtime-specific APIs.
- Four categories only: `human`, `crawler`, `script`, `suspicious`. Check order: `script` → `crawler` → `suspicious` → default `human`.
- Backfill is a manual, one-off run (not wired into CI/build), using UA alone (historical rows have no stored `Accept`/`Accept-Language`).

---

## File Structure

- **Create** `src/lib/visitorNature.ts` — the classifier: `VisitorNature` type, signature constant lists, `classifyVisitor()`.
- **Create** `scripts/backfill-visitor-nature.mjs` — one-off Node script to reclassify existing `visits` rows.
- **Modify** `api/track.ts` — add `nature` column to `ensureTable()`, classify at insert time, store in the new column.
- **Modify** `api/visits.ts` — select `nature` in the visitor aggregate query, compute and return `natureBreakdown`.
- **Modify** `src/components/charts/Charts.tsx` — add a `Pill` primitive (small colored badge) reused by the table column and filter buttons.
- **Modify** `src/components/admin/VisitorAnalytics.tsx` — add nature stat tiles and a nature breakdown chart; extend `Analytics`/`VisitorLike` types.
- **Modify** `src/pages/AdminPage.tsx` — add `nature` to `VisitorRow`, add a nature column to the visitor table, add filter toggle buttons.

---

### Task 1: Classifier module

**Files:**
- Create: `src/lib/visitorNature.ts`

**Interfaces:**
- Produces: `export type VisitorNature = 'human' | 'crawler' | 'script' | 'suspicious';` and `export function classifyVisitor(userAgent: string | null | undefined, headers: { acceptLanguage?: string | null; accept?: string | null }): VisitorNature`. Later tasks (`api/track.ts`, `api/visits.ts`, the backfill script, and any UI code needing category labels/colors) import both.

- [ ] **Step 1: Write the classifier with inline manual-check comment (no test framework exists in this project)**

Create `src/lib/visitorNature.ts`:

```ts
// Classifies a visit's "nature" from request headers alone - no external API,
// no IP intelligence service. Order matters: script/crawler signatures are
// checked first because they're high-confidence positive matches; suspicious
// is a fallback bucket for requests that match neither list but still look
// off; anything left over defaults to human.

export type VisitorNature = 'human' | 'crawler' | 'script' | 'suspicious';

export const NATURE_LABELS: Record<VisitorNature, string> = {
  human: 'Human',
  crawler: 'Crawler',
  script: 'Script',
  suspicious: 'Suspicious',
};

// Tools, scripts, and headless automation - not search engines, which get
// their own allowlist below since they're generally welcome traffic.
const SCRIPT_PATTERNS: RegExp[] = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /\baxios\//i,
  /node-fetch/i,
  /go-http-client/i,
  /postmanruntime/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /okhttp/i,
  /java\//i,
  /libwww-perl/i,
  /\bscrapy\b/i,
];

// Known-good crawlers: search engines and link-preview bots. Not exhaustive,
// but covers the traffic a portfolio site actually sees.
const CRAWLER_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /slurp/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /applebot/i,
  /yandexbot/i,
  /baiduspider/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /slackbot/i,
];

// Catches generic "bot"/"spider"/"crawler" self-identification that isn't on
// either specific list above - still worth bucketing as script rather than
// falling through to suspicious/human.
const GENERIC_BOT_PATTERN = /bot|spider|crawler/i;

export function classifyVisitor(
  userAgent: string | null | undefined,
  headers: { acceptLanguage?: string | null; accept?: string | null } = {},
): VisitorNature {
  const ua = (userAgent ?? '').trim();

  if (!ua) return 'script';
  if (SCRIPT_PATTERNS.some(p => p.test(ua))) return 'script';
  if (CRAWLER_PATTERNS.some(p => p.test(ua))) return 'crawler';
  if (GENERIC_BOT_PATTERN.test(ua)) return 'script';

  const acceptLanguage = headers.acceptLanguage ?? '';
  const accept = headers.accept ?? '';
  const looksMalformed = ua.length < 15 || !/mozilla/i.test(ua);
  const missingLanguage = !acceptLanguage;
  const missingAccept = !accept;

  if (looksMalformed || (missingLanguage && missingAccept)) return 'suspicious';

  return 'human';
}
```

- [ ] **Step 2: Manually verify against representative UA strings**

Run: `node --input-type=module -e "
import { classifyVisitor } from './src/lib/visitorNature.ts';
" 2>&1 || true`

This project has no test runner and `.ts` can't be run directly by plain `node`. Instead verify with a scratch `.mjs` file that inlines the same logic check via `tsx`-free manual trace, OR verify after Task 3 wires it into `api/track.ts` by hitting the endpoint with `curl` (see Task 3 Step 4, which is the real verification point). For this step, read through the function against these cases and confirm the expected output by inspection:

| userAgent | headers | expected |
|---|---|---|
| `null` | `{}` | `script` (empty UA) |
| `curl/8.4.0` | `{}` | `script` |
| `Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)` | `{}` | `crawler` |
| `python-requests/2.31.0` | `{}` | `script` |
| `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36` | `{ acceptLanguage: 'en-US', accept: 'text/html' }` | `human` |
| `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36` | `{}` | `suspicious` (missing both headers) |
| `SomeShortUA/1.0` | `{ acceptLanguage: 'en-US', accept: 'text/html' }` | `suspicious` (too short / no "mozilla") |

Confirm each row's expected value matches what the function in Step 1 produces by tracing the code path manually. This is the plan's documented "test" for this pure-function module given the project has no test framework.

- [ ] **Step 3: Commit**

```bash
git add src/lib/visitorNature.ts
git commit -m "feat: add heuristic visitor nature classifier"
```

---

### Task 2: Schema + write-path integration

**Files:**
- Modify: `api/track.ts:19-38` (`ensureTable`), `api/track.ts:40-74` (`handler`)

**Interfaces:**
- Consumes: `classifyVisitor(userAgent, { acceptLanguage, accept })` from `src/lib/visitorNature.ts` (Task 1).
- Produces: `visits.nature` column, populated on every new insert. Later tasks (`api/visits.ts`) read this column.

- [ ] **Step 1: Add the column to `ensureTable()`**

In `api/track.ts`, modify the `ensureTable` function:

```ts
async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id BIGSERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      ip TEXT,
      country TEXT,
      city TEXT,
      user_agent TEXT,
      referrer TEXT,
      path TEXT,
      event TEXT NOT NULL DEFAULT 'pageview',
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Columns added after the table's first deployment - safe no-ops once applied.
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS event TEXT NOT NULL DEFAULT 'pageview'`;
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS detail TEXT`;
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS nature TEXT NOT NULL DEFAULT 'human'`;
}
```

- [ ] **Step 2: Classify and store at insert time**

Add the import at the top of `api/track.ts`:

```ts
import { classifyVisitor } from '../src/lib/visitorNature';
```

In the `handler` function, after `const userAgent = req.headers.get('user-agent');` (line 60), add:

```ts
  const nature = classifyVisitor(userAgent, {
    acceptLanguage: req.headers.get('accept-language'),
    accept: req.headers.get('accept'),
  });
```

Then update the `INSERT` statement:

```ts
    await sql`
      INSERT INTO visits (visitor_id, ip, country, city, user_agent, referrer, path, event, detail, nature)
      VALUES (${visitorId}, ${ip}, ${country}, ${city}, ${userAgent}, ${body.referrer ?? null}, ${body.path ?? null}, ${event}, ${detail}, ${nature})
    `;
```

- [ ] **Step 3: Verify locally**

Run: `npm run dev` (or `vercel dev` if that's how Edge functions are served locally in this project — check for a `vercel dev` habit by running `vercel dev` if `POSTGRES_URL` is available locally; otherwise skip live DB verification and rely on Step 4's static check).

Run a static sanity check instead, since Edge functions require Vercel's dev server:

```bash
npx tsc --noEmit
```

Expected: no new type errors introduced by `api/track.ts`'s changes. (Note: `api/*.ts` files are not under `tsconfig.json`'s `include: ["src"]` — confirm this command still typechecks them or, if it doesn't, confirm `api/track.ts` has no new syntax errors by reading the diff carefully. If `tsc --noEmit` doesn't cover `api/`, that's pre-existing project behavior, not something this task should change.)

- [ ] **Step 4: Commit**

```bash
git add api/track.ts
git commit -m "feat: classify and store visitor nature at write time"
```

---

### Task 3: Read-path aggregation

**Files:**
- Modify: `api/visits.ts:46-101` (parallel queries), `api/visits.ts:103-142` (response shaping)

**Interfaces:**
- Consumes: `visits.nature` column (Task 2).
- Produces: each object in the `visitors` array gains a `nature: string` field; the JSON response gains `natureBreakdown: { human: number; crawler: number; script: number; suspicious: number }`. Task 5/6 (UI) consume both.

- [ ] **Step 1: Include `nature` in the per-visitor query**

In `api/visits.ts`, modify the `latestPerVisitor` query (inside the `Promise.all` array):

```ts
      sql`
        SELECT DISTINCT ON (visitor_id)
          visitor_id, ip, country, city, user_agent, nature, path AS last_path,
          referrer AS last_referrer, created_at AS last_seen
        FROM visits
        ORDER BY visitor_id, created_at DESC
      `,
```

- [ ] **Step 2: Add a nature-breakdown aggregate query**

Add a new query to the same `Promise.all` array (after `byHour`, before the closing `]`):

```ts
      sql`
        SELECT nature, COUNT(*) AS n FROM visits GROUP BY 1
      `,
```

Update the destructuring line above the array to capture it:

```ts
    const [latestPerVisitor, aggregates, recent, daily, topPaths, topReferrers, topEvents, byHour, natureCounts] = await Promise.all([
```

- [ ] **Step 3: Shape `nature` into visitor rows and build `natureBreakdown`**

In the `visitors` mapping (around line 104-121), add `nature: v.nature` to the returned object:

```ts
    const visitors = latestPerVisitor.rows
      .map(v => {
        const agg = aggByVisitor.get(v.visitor_id);
        return {
          visitorId: v.visitor_id,
          ip: v.ip,
          country: v.country,
          city: v.city,
          userAgent: v.user_agent,
          nature: v.nature,
          lastPath: v.last_path,
          lastReferrer: v.last_referrer,
          lastSeen: v.last_seen,
          firstSeen: agg?.first_seen ?? v.last_seen,
          visitCount: Number(agg?.visit_count ?? 1),
          eventCount: Number(agg?.event_count ?? 1),
        };
      })
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
```

Before the final `return json({...})`, build the breakdown:

```ts
    const natureBreakdown = { human: 0, crawler: 0, script: 0, suspicious: 0 };
    for (const row of natureCounts.rows) {
      const key = row.nature as keyof typeof natureBreakdown;
      if (key in natureBreakdown) natureBreakdown[key] = Number(row.n);
    }
```

Add `natureBreakdown` to the returned JSON object:

```ts
    return json({
      visitors,
      analytics: {
        daily: daily.rows.map(r => ({ day: r.day, views: Number(r.views), uniques: Number(r.uniques) })),
        topPaths: topPaths.rows.map(r => ({ label: r.path, n: Number(r.n) })),
        topReferrers: topReferrers.rows.map(r => ({ label: r.referrer, n: Number(r.n) })),
        topEvents: topEvents.rows.map(r => ({ label: r.event, n: Number(r.n) })),
        byHour: byHour.rows.map(r => ({ hour: r.hour, n: Number(r.n) })),
        natureBreakdown,
      },
      recent: recent.rows.map(r => ({
        visitorId: r.visitor_id,
        ip: r.ip,
        country: r.country,
        path: r.path,
        event: r.event,
        detail: r.detail,
        referrer: r.referrer,
        createdAt: r.created_at,
      })),
    });
```

- [ ] **Step 4: Verify with a live request (requires `POSTGRES_URL` + `ADMIN_KEY` set, via `vercel dev`)**

Run: `curl -s "http://localhost:3000/api/visits?key=$ADMIN_KEY" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).analytics.natureBreakdown))"`

Expected: an object like `{"human": 12, "crawler": 3, "script": 1, "suspicious": 0}` with no error field in the response. If `POSTGRES_URL` isn't available locally, skip live verification here and rely on Task 6's end-to-end browser check instead — note that in the task's completion notes.

- [ ] **Step 5: Commit**

```bash
git add api/visits.ts
git commit -m "feat: include visitor nature and breakdown in visits API"
```

---

### Task 4: Backfill script

**Files:**
- Create: `scripts/backfill-visitor-nature.mjs`

**Interfaces:**
- Consumes: `classifyVisitor` — but since this is a plain `.mjs` Node script and `src/lib/visitorNature.ts` is TypeScript, the script re-implements the same logic inline as plain JS (matching the project's existing pattern of standalone `.mjs` scripts under `scripts/` having no cross-imports into `src/`, confirmed by `scripts/generate-sitemap.mjs` only importing `node:fs`/`node:url`/`node:path`). To avoid drift between the two copies, the inline copy is a direct line-for-line JS port of Task 1's function — any future change to the classifier's rules should update both.
- Produces: updates every existing row's `nature` column in place. No other task depends on this script's internals — it's a one-off, manually-run operation.

- [ ] **Step 1: Write the backfill script**

Create `scripts/backfill-visitor-nature.mjs`:

```js
// One-off backfill: reclassifies every existing `visits` row's `nature`
// column from its stored user_agent. Run manually once after deploying the
// nature column (see Task 2) - not part of any automated pipeline.
//
// Usage: POSTGRES_URL=... node scripts/backfill-visitor-nature.mjs [--dry-run]
//
// This is a plain JS port of src/lib/visitorNature.ts's classifyVisitor().
// Historical rows have no stored Accept/Accept-Language headers, so this
// port only uses the userAgent-based branches - the header-based
// "suspicious" checks that need acceptLanguage/accept always see them as
// absent here, which is an accepted limitation (see design spec).
import { sql } from '@vercel/postgres';

const SCRIPT_PATTERNS = [
  /curl\//i, /wget\//i, /python-requests/i, /python-urllib/i, /\baxios\//i,
  /node-fetch/i, /go-http-client/i, /postmanruntime/i, /headlesschrome/i,
  /puppeteer/i, /playwright/i, /okhttp/i, /java\//i, /libwww-perl/i, /\bscrapy\b/i,
];

const CRAWLER_PATTERNS = [
  /googlebot/i, /bingbot/i, /duckduckbot/i, /slurp/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /applebot/i, /yandexbot/i, /baiduspider/i,
  /discordbot/i, /telegrambot/i, /whatsapp/i, /slackbot/i,
];

const GENERIC_BOT_PATTERN = /bot|spider|crawler/i;

function classifyFromUserAgentOnly(userAgent) {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'script';
  if (SCRIPT_PATTERNS.some(p => p.test(ua))) return 'script';
  if (CRAWLER_PATTERNS.some(p => p.test(ua))) return 'crawler';
  if (GENERIC_BOT_PATTERN.test(ua)) return 'script';
  const looksMalformed = ua.length < 15 || !/mozilla/i.test(ua);
  if (looksMalformed) return 'suspicious';
  return 'human';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not set. Run `vercel env pull` first, or pass it inline.');
    process.exit(1);
  }

  const { rows } = await sql`SELECT id, user_agent FROM visits`;
  console.log(`Found ${rows.length} rows to reclassify.`);

  const counts = { human: 0, crawler: 0, script: 0, suspicious: 0 };
  const updates = rows.map(r => {
    const nature = classifyFromUserAgentOnly(r.user_agent);
    counts[nature]++;
    return { id: r.id, nature };
  });

  console.log('Projected distribution:', counts);

  if (dryRun) {
    console.log('Dry run - no rows updated. Re-run without --dry-run to apply.');
    return;
  }

  for (const { id, nature } of updates) {
    await sql`UPDATE visits SET nature = ${nature} WHERE id = ${id}`;
  }
  console.log(`Updated ${updates.length} rows.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Dry-run against the real table to sanity-check distribution**

Run: `POSTGRES_URL="$(vercel env pull /dev/stdout --yes 2>/dev/null | grep POSTGRES_URL | cut -d= -f2- | tr -d '"')" node scripts/backfill-visitor-nature.mjs --dry-run`

(If `vercel env pull` isn't set up locally, run `vercel env pull .env.local` once first, then `source .env.local` before running the script with plain `node scripts/backfill-visitor-nature.mjs --dry-run`.)

Expected output: `Found N rows to reclassify.` followed by `Projected distribution: { human: X, crawler: Y, script: Z, suspicious: W }` with no thrown error, and `Dry run - no rows updated...`. Confirm the distribution looks plausible (mostly `human`, small `crawler`/`script` counts) before proceeding.

- [ ] **Step 3: Run for real**

Run: `node scripts/backfill-visitor-nature.mjs`

Expected: `Updated N rows.` matching the row count from Step 2.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-visitor-nature.mjs
git commit -m "feat: add one-off backfill script for visitor nature classification"
```

---

### Task 5: `Pill` chart primitive

**Files:**
- Modify: `src/components/charts/Charts.tsx`

**Interfaces:**
- Produces: `export function Pill({ label, tone }: { label: string; tone: 'accent' | 'info' | 'warning' | 'danger' }): JSX.Element`. Consumed by Task 6 (table column) and Task 7 (filter buttons, breakdown chart legend-equivalent).

- [ ] **Step 1: Add the `Pill` component**

In `src/components/charts/Charts.tsx`, add after the `Bar` function (after line 43):

```tsx
const PILL_TONES: Record<'accent' | 'info' | 'warning' | 'danger', { bg: string; fg: string }> = {
  accent: { bg: 'var(--accent-dim)', fg: 'var(--accent)' },
  info: { bg: 'rgba(96, 165, 250, 0.15)', fg: '#60A5FA' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#F59E0B' },
  danger: { bg: 'rgba(255, 107, 107, 0.15)', fg: '#FF6B6B' },
};

// Small colored status badge - reused for visitor "nature" (human/crawler/
// script/suspicious) and any future single-word categorical tag.
export function Pill({ label, tone }: { label: string; tone: keyof typeof PILL_TONES }) {
  const { bg, fg } = PILL_TONES[tone];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '100px',
      background: bg, color: fg, fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.66rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`

Expected: no new errors from `Charts.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/Charts.tsx
git commit -m "feat: add Pill badge primitive to chart components"
```

---

### Task 6: Admin table — nature column

**Files:**
- Modify: `src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: `Pill` from `../components/charts/Charts` (Task 5); `VisitorNature`, `NATURE_LABELS` from `../lib/visitorNature` (Task 1); `nature` field on visitor objects from `/api/visits` (Task 3).
- Produces: visitor table renders a "nature" column; `VisitorRow` interface gains `nature: VisitorNature`. Task 7 depends on this same `VisitorRow.nature` field for filtering.

- [ ] **Step 1: Extend `VisitorRow` and import dependencies**

In `src/pages/AdminPage.tsx`, add the import (after line 4):

```tsx
import { Pill } from '../components/charts/Charts';
import type { VisitorNature } from '../lib/visitorNature';
import { NATURE_LABELS } from '../lib/visitorNature';
```

Update `VisitorRow` (lines 8-20) to add the field:

```tsx
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
}
```

- [ ] **Step 2: Add a nature-to-tone helper**

Add near `parseUA` (after line 58):

```tsx
function natureTone(nature: VisitorNature): 'accent' | 'info' | 'warning' | 'danger' {
  switch (nature) {
    case 'human': return 'accent';
    case 'crawler': return 'info';
    case 'script': return 'warning';
    case 'suspicious': return 'danger';
  }
}
```

- [ ] **Step 3: Add the column header and cell**

In the table header array (line 250), add `'nature'` after `'device'`:

```tsx
{['', 'visitor', 'ip', 'location', 'device', 'nature', 'visits', 'events', 'first seen', 'last seen', 'last page'].map(h => (
```

Add a `colSpan={11}` update everywhere `colSpan={10}` currently appears for this table (lines 281, 307) since the column count increases from 10 to 11:

```tsx
                        <td colSpan={11} style={{ padding: '0 14px 14px 40px', background: 'var(--surface-2)' }}>
```

and

```tsx
                <tr><td colSpan={11} style={{ padding: '20px 14px', color: 'var(--text-dim)', textAlign: 'center' }}>no visits recorded yet</td></tr>
```

Add the cell in the row (after the `device` cell, line 272):

```tsx
                      <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{parseUA(v.userAgent)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Pill label={NATURE_LABELS[v.nature]} tone={natureTone(v.nature)} />
                      </td>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "feat: show visitor nature pill column in admin table"
```

---

### Task 7: Admin filter + stat tiles + breakdown chart

**Files:**
- Modify: `src/pages/AdminPage.tsx` (filter state + toggle buttons + table filtering)
- Modify: `src/components/admin/VisitorAnalytics.tsx` (stat tiles + breakdown chart)

**Interfaces:**
- Consumes: `VisitorRow.nature` (Task 6), `Analytics.natureBreakdown` (Task 3), `NATURE_LABELS`/`VisitorNature` (Task 1), `Pill`/`Bar`/`ChartCard`/`StatTile`/`StatRow` (existing + Task 5).
- Produces: filtered visitor table in `AdminPage.tsx`; extended `Analytics` type and rendered breakdown UI in `VisitorAnalytics.tsx`. Terminal task — nothing downstream depends on this.

- [ ] **Step 1: Extend the `Analytics` type and add stat tiles + chart in `VisitorAnalytics.tsx`**

In `src/components/admin/VisitorAnalytics.tsx`, update the `Analytics` interface (lines 3-9):

```tsx
export interface Analytics {
  daily: { day: string; views: number; uniques: number }[];
  topPaths: { label: string; n: number }[];
  topReferrers: { label: string; n: number }[];
  topEvents: { label: string; n: number }[];
  byHour: { hour: string; n: number }[];
  natureBreakdown: { human: number; crawler: number; script: number; suspicious: number };
}
```

Add the import at the top (line 1):

```tsx
import { Bar, Columns, ChartCard, StatTile, StatRow, ChartGrid, topCounts } from '../charts/Charts';
```

(unchanged — `Bar` and `ChartCard` are already imported and are all this chart needs.)

In the `VisitorAnalytics` function body, after the existing derived stats (around line 64, after `avgEvents`), add:

```tsx
  const natureTotal = Object.values(analytics.natureBreakdown).reduce((s, n) => s + n, 0);
  const humanPct = natureTotal ? Math.round((analytics.natureBreakdown.human / natureTotal) * 100) : 0;
  const natureRows: [string, number][] = [
    ['human', analytics.natureBreakdown.human],
    ['crawler', analytics.natureBreakdown.crawler],
    ['script', analytics.natureBreakdown.script],
    ['suspicious', analytics.natureBreakdown.suspicious],
  ];
  const natureMax = Math.max(1, ...natureRows.map(r => r[1]));
```

Add a stat tile to the existing `StatRow` (line 84-90), inserting after `returning`:

```tsx
      <StatRow>
        <StatTile value={visitors.length} label="visitors" />
        <StatTile value={totalViews} label="views (30d)" />
        <StatTile value={totalEvents} label="events" />
        <StatTile value={returning} label="returning" />
        <StatTile value={`${humanPct}%`} label="human traffic" />
        <StatTile value={avgEvents} label="events / visitor" />
      </StatRow>
```

Add a new `ChartCard` to the `ChartGrid` (insert after the "activity by hour" card, before the closing `</ChartGrid>` at line 144):

```tsx
        <ChartCard title="traffic by nature" note="all time">
          {natureRows.map(([label, n]) => (
            <Bar key={label} label={label} count={n} max={natureMax} />
          ))}
        </ChartCard>
```

- [ ] **Step 2: Add filter state and toggle buttons in `AdminPage.tsx`**

Add the import (alongside Task 6's imports):

```tsx
import type { VisitorNature } from '../lib/visitorNature';
```

(Already added in Task 6 — skip if duplicate.)

Add filter state near the other `useState` declarations (after line 92, `const [analytics, ...]`):

```tsx
  const [natureFilter, setNatureFilter] = useState<VisitorNature | 'all'>('all');
```

Add a derived filtered list inside the component function, immediately before line 206's `return (` for the authenticated view (i.e. right after the `useEffect` block that ends at line 151, before the `if (!authed) {` check at line 153):

```tsx
  const filteredVisitors = natureFilter === 'all'
    ? visitors
    : visitors.filter(v => v.nature === natureFilter);
```

This keeps it computed once per render, available to both the count label and the table body below.

Add filter toggle buttons in the JSX, right after the "known visitors" label row (after line 242's closing `</div>`, before the table wrapper `<div style={{ overflowX: 'auto', ...`):

```tsx
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
```

Update the table body to map over `filteredVisitors` instead of `visitors` (line 256): change `{visitors.map(v => {` to `{filteredVisitors.map(v => {`, and the empty-state check (line 306) from `{visitors.length === 0 && (` to `{filteredVisitors.length === 0 && (`.

Update the visitor-count label (line 240) to reflect the filtered count:

```tsx
            {filteredVisitors.length} known visitor{filteredVisitors.length === 1 ? '' : 's'} · click a row for full activity
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, open `/admin`, unlock with the configured `ADMIN_KEY`, and confirm:
- Stat row shows a "human traffic" percentage tile.
- A "traffic by nature" chart renders with four bars.
- The visitor table has a "nature" column with colored pills.
- Clicking each filter pill (All/Human/Crawler/Script/Suspicious) narrows the table correctly and updates the visitor count label.
- Toggle the site's light/dark theme and confirm pill colors remain legible in both.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.tsx src/components/admin/VisitorAnalytics.tsx
git commit -m "feat: add nature filter, stat tile, and breakdown chart to admin dashboard"
```

---

## Post-plan note

Update `.env.example`'s visitor-tracking comment block (`.env.example:35-43`) only if a reviewer wants the `nature` column documented there — the design spec's Non-goals explicitly rule out new env vars for this feature, so no `.env.example` change is required by this plan.
