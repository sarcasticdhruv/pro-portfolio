# 404 Meme Viewer Modal

**Date:** 2026-09-09
**Status:** Approved

## Problem

The 404 page shows one meme in a 360px-wide card with `objectFit: contain` and a
360px height cap. Tall multi-panel memes — common on r/ProgrammerHumor — render
too small to read. "Another one" replaces the current meme with no history, so a
meme the visitor liked cannot be recovered.

## Solution

Clicking the meme opens a full-screen modal that views it at full size and pages
through every meme seen this session.

### Scope

In scope: full-size viewing, next/prev over session history, keyboard nav,
top-bar actions (shuffle, open original, copy link, close).

Explicitly cut as YAGNI: thumbnail strip, subreddit filter, slideshow/autoplay,
zoom and pan.

## Architecture

Two units with one clear boundary.

**`NotFoundPage.tsx`** owns meme data. Its single `meme` state becomes:

- `memes: Meme[]` — every meme fetched this session, in order
- `index: number` — which one is displayed

The existing card renders `memes[index]`. `shuffleAll()` appends rather than
replaces. This keeps all fetching in the page and none in the modal.

**`MemeModal.tsx`** (new, `src/components/MemeModal.tsx`) is presentational. Props:

```
meme: Meme            // the meme to display
index: number         // position, for the counter
total: number         // history length, for the counter
onPrev / onNext       // undefined when at a boundary, which disables the control
onShuffle             // fetch a fresh meme and advance to it
onClose
```

It holds no fetch logic and no history, so it can be understood and tested on its
own: given a meme and callbacks, it draws a viewer.

### Data flow

Card click → `setModalOpen(true)`. Modal calls `onNext`; the page increments
`index`. At the end of history `onNext` is undefined and only `onShuffle` fetches,
appends, and advances — so a fetch happens only on explicit intent, never
implicitly from arrow-key navigation.

## Visual design

Follows the existing popup at `Hero.tsx:259` so it reads as the same product:
`position: fixed; inset: 0`, `rgba(7,17,10,0.72)` with a 6px backdrop blur,
click-backdrop-to-close, `stopPropagation` on the panel, `popupFadeIn` on the
backdrop and `popupSlideUp` on the panel. Theme tokens throughout
(`--surface`, `--border-2`, `--text`, `--text-dim`, `--accent`), never hardcoded
color, matching the light-mode contrast fix already made on this page.

Top bar: meme title (ellipsised) plus `r/subreddit` on the left; icon buttons on
the right in order — shuffle, open original, copy link, close.

Image: `max-height: 82vh`, `objectFit: contain`, so tall memes get the viewport
instead of 360px.

Bottom: prev / `3 / 7` counter / next, with a `← → esc` keyboard hint.

## Interaction

- `Escape` closes — the idiom at `ShareMenu.tsx:32`
- `←` / `→` page through history
- Body scroll locks while open, restoring the prior value on close
- Copy link uses `navigator.clipboard.writeText` and shows a transient "copied"
  state; the button is hidden when the API is unavailable rather than failing
  silently
- Boundary controls are disabled and visibly dimmed, never absent, so the layout
  does not shift while paging

## Error handling

- `onError` on the image marks that meme broken and shows the existing
  `ImageOff` empty state inside the modal, rather than closing it
- Modal renders nothing when there is no meme, so the card's own loading and
  empty states stay the only place that logic lives
- A meme whose image fails is kept in history, so the counter stays stable

## Testing

Manual, matching this project's convention (no test runner is configured):
open 404, click the meme, page with arrows and keys, shuffle at the end of
history, copy a link, verify Escape and backdrop close, confirm scroll lock
releases, and check both themes plus a narrow viewport.
