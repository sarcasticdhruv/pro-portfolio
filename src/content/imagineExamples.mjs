// Static, always-visible prompt ideas shown on /imagine - same content for
// every visitor (human or crawler), so the page has real indexable substance
// instead of an empty shell. Imported by ImaginePage.tsx (client UI) and
// scripts/prerender.mjs (build-time static HTML) so both stay in sync from
// one source. `.mjs` (not `.ts`) so the plain Node build script can import
// it directly with no loader. Text-only - no sample output images exist yet.
export const IMAGINE_EXAMPLES = [
  {
    prompt: 'a minimalist poster for an AI engineering blog, deep green and black',
    styleNote: 'Flat, high-contrast poster design - good for testing bold color blocking.',
  },
  {
    prompt: 'an isometric illustration of a neural network as a small city',
    styleNote: 'Isometric/technical illustration style, geometric and clean.',
  },
  {
    prompt: 'a retro terminal glowing in a dark room, cinematic',
    styleNote: 'Moody, cinematic lighting - good for testing atmosphere and contrast.',
  },
  {
    prompt: 'a hummingbird made of circuit traces, on white',
    styleNote: 'Fine-detail linework on a plain background, mixing organic and technical shapes.',
  },
  {
    prompt: 'a cozy reading nook with warm lamp light, watercolor style',
    styleNote: 'Soft watercolor style - good for testing gentle color gradients.',
  },
  {
    prompt: 'a spaceship control room, 1970s sci-fi paperback cover art',
    styleNote: 'Retro sci-fi illustration - bold shapes, saturated color, painterly texture.',
  },
];
