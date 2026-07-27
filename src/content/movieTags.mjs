// Fixed personal tag vocabulary for /watched, used by the client UI (the
// admin preview editor's toggles and the WatchedPage tag pills).
//
// api/movies.ts keeps its own copy of this list and is the AUTHORITY: it
// filters any incoming tag that isn't in its list before writing. That
// duplication is deliberate - Vercel bundles api/ separately from src/, and a
// cross-directory import there can't be verified by the local `npm run build`
// (which only runs vite). A 10-string list duplicated with a sync comment
// beats an unverifiable import in a deploy-only code path. If the two ever
// drift, the server silently wins, which is the safe direction.
//
// KEEP IN SYNC WITH: the MOVIE_TAGS array in api/movies.ts
export const MOVIE_TAGS = [
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
