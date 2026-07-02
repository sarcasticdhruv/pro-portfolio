# Agentic Search Page — Design

**Date:** 2026-07-02
**Status:** Approved by user (architecture, pipeline, history all confirmed)

## Goal

Add a new `/search` page (with a "search" tab in the Navbar) that provides an
agentic-styled smart search: a live step timeline, streamed AI answers, source
cards, and per-device history. Frontend-only — the site is a static Vite SPA on
Netlify (`public/_redirects`: `/* /index.html 200`). No backend, no database,
no deployment changes. New env keys are optional.

## Constraints

- Must not disrupt existing pages, the AI chatbot, or the hero terminal.
- No server: all API calls happen from the browser (Groq is already called
  client-side by `Terminal.tsx` and `AIChatbot.tsx`).
- History is device-wise via `localStorage`, deliberately small (user request:
  "don't store a lot of data").
- Works with only the existing `VITE_GROQ_API_KEY`; extra provider keys are
  opt-in fallbacks.

## Architecture

New files:

| File | Responsibility |
|---|---|
| `src/pages/SearchPage.tsx` | Page UI: input, live step timeline (collapses when done), streamed answer, source cards, history panel with clear button |
| `src/lib/searchAgent.ts` | 3-lane pipeline: classify → retrieve → synthesize. Emits typed step events consumed by the timeline |
| `src/lib/contentIndex.ts` | Builds the searchable index at module load: blog posts from `ALL_POSTS` (`src/lib/blog.ts`, markdown already bundled) plus static records for projects, experience, skills, achievements |
| `src/lib/providers.ts` | Ordered provider chain with auto-fallback on failure/429: Groq (`VITE_GROQ_SEARCH_API_KEY` → `VITE_GROQ_API_KEY`) → Gemini (`VITE_GEMINI_API_KEY`, optional) → OpenRouter (`VITE_OPENROUTER_API_KEY`, optional). All OpenAI-compatible chat calls with streaming |
| `src/lib/searchHistory.ts` | localStorage CRUD for history entries |

Touched existing files (minimal):

- `src/router.tsx`: add `{ path: 'search', element: <SearchPage /> }`.
- `src/components/Navbar.tsx`: add a "search" tab.

## Pipeline (each timeline step is a real stage)

1. **Classify** — local heuristics, no API call. Mentions of Dhruv / the site /
   project or blog names / "you/your" → **site lane**. Otherwise → **web
   lane**. Ambiguous → run both.
2. **Retrieve (site lane)** — tokenized keyword/fuzzy scoring over the content
   index (title, tags, body). Top 4 chunks (~500 chars each) become source
   cards linking to `/blog/:slug`, `/#projects`, `/#experience`, etc.
3. **Retrieve (web lane)** — `groq/compound-mini`, Groq's agentic system with
   built-in server-side web search. Any site matches render as secondary
   sources.
4. **Synthesize** — `llama-3.3-70b-versatile` streams the answer, grounded in
   the retrieved chunks and instructed to cite them. Timeline collapses to a
   one-line summary when streaming completes.

Model IDs are configured in one place (`providers.ts`) and verified against
Groq's current catalog at implementation time.

## History / cache

- Key: `dc_search_history_v1` in `localStorage`.
- Entry: `{ id, query, lane, sources, answer, createdAt }` with the answer
  trimmed to ~6 KB.
- Cap: 20 entries, oldest evicted. Worst case ≈ 120 KB.
- Clicking a history item restores the full result instantly — no API call —
  so history doubles as a cache. Identical repeat queries hit it too.
- "Clear history" button wipes the key. All writes wrapped in try/catch
  (quota-safe, same pattern as `src/utils/api.ts`).

## Error handling & degradation

- Each provider call: try/catch; on network error or HTTP 429, fall through to
  the next configured provider.
- If every AI provider fails, the page still shows local site results with a
  plain "AI unavailable" notice — never a dead page.
- The existing chatbot and terminal share no code paths with search except
  (optionally) the Groq env key.

## Security note (accepted trade-off)

All `VITE_*` keys are bundled into client JS and extractable — true today for
the existing Groq key. The optional second Groq key only isolates quota. A
Gemini key can be HTTP-referrer-restricted in Google's console, making it the
safest client-side fallback.

## Testing plan (manual, dev server + build preview)

1. Site-lane query ("what projects has he built?") → source cards to site pages.
2. Web-lane query (current-events question) → compound-mini answer.
3. Ambiguous query → both lanes, merged sources.
4. History: persists across reload, restores without network calls, cap
   eviction at 20, clear button works.
5. Fallback: break the Groq key locally → chain falls through / local-only mode.
6. `bun run build` + preview: deep link to `/search` works (SPA redirect);
   existing pages unaffected.
