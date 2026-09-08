import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ImageOff, Shuffle } from 'lucide-react';
import MemeModal from '../components/MemeModal';

// a small list of playful/techy 404 messages; shuffled each render
const messages = [
  'Oops! This page escaped our neural network.',
  '404: Even AI can’t find this.',
  'The page you’re looking for went on a coffee break.',
  'Looks like you wandered into the void.',
  'Well, this is awkward. Nothing here but air.',
  'We looked everywhere. Even under the couch. Nada.',
  'You fell into the 404 dungeon. Escape?',
  'This page is lost… like socks in the dryer.',
  '404: This is not the blog post you are looking for.',
  'Houston, we have a 404.',
];

function pickRandom() {
  return messages[Math.floor(Math.random() * messages.length)];
}

// Keyless, CORS-open meme feed. Skips anything flagged nsfw/spoiler.
const MEME_SUBS = ['ProgrammerHumor', 'programmingmemes', 'wholesomememes', 'memes'];
const FETCH_TIMEOUT_MS = 4000;

import type { Meme } from '../components/MemeModal';

async function fetchOneMeme(sub: string, signal: AbortSignal): Promise<Meme | null> {
  try {
    const res = await fetch(`https://meme-api.com/gimme/${sub}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.nsfw || data.spoiler || !data.url) return null;
    return { url: data.url, title: data.title, subreddit: data.subreddit };
  } catch {
    return null;
  }
}

// Fires a few subreddits concurrently and takes whichever responds first
// with a valid, safe-for-work meme - a slow or empty one no longer adds to
// the wait the way sequential retries did. Bounded by a hard timeout so a
// hung request can't stall the page indefinitely.
function fetchMeme(): Promise<Meme | null> {
  const subs = [...MEME_SUBS].sort(() => Math.random() - 0.5).slice(0, 3);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return new Promise(resolve => {
    let done = false;
    let settled = 0;
    const finish = (m: Meme | null) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      controller.abort();
      resolve(m);
    };
    subs.forEach(sub => {
      fetchOneMeme(sub, controller.signal).then(m => {
        settled++;
        if (m) finish(m);
        else if (settled === subs.length) finish(null);
      });
    });
  });
}

export default function NotFoundPage() {
  const [msg, setMsg] = useState(() => pickRandom());
  // Every meme fetched this session, so shuffling forward never loses one.
  const [memes, setMemes] = useState<Meme[]>([]);
  const [index, setIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [memeLoading, setMemeLoading] = useState(true);
  // Tracks the actual <img> finishing its download, not just the API call
  // that resolves the URL - without this the spinner vanished and left a
  // blank box while the real image (hosted on Reddit's CDN) was still
  // loading behind the scenes.
  const [imgReady, setImgReady] = useState(false);
  const mounted = useRef(true);
  // Mirrors `memes` so loadMeme can compute the target index without
  // depending on (and re-creating itself for) every history change.
  const memesRef = useRef<Meme[]>([]);

  const loadMeme = useCallback(() => {
    setMemeLoading(true);
    setImgReady(false);
    fetchMeme().then(m => {
      if (!mounted.current) return;
      if (m) {
        // Append and jump to the new meme, deduped by url - StrictMode
        // double-invokes the mount effect, which would otherwise seed history
        // with the same meme twice. Both setters are called directly rather
        // than nested inside an updater, so neither runs twice.
        setMemes(prev => (prev.some(x => x.url === m.url) ? prev : [...prev, m]));
        setIndex(() => {
          const seen = memesRef.current.findIndex(x => x.url === m.url);
          return seen !== -1 ? seen : memesRef.current.length;
        });
      }
      setMemeLoading(false);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadMeme();
    return () => { mounted.current = false; };
  }, [loadMeme]);

  const meme = memes[index] ?? null;
  memesRef.current = memes;

  function shuffleAll() {
    setMsg(pickRandom());
    loadMeme();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        paddingTop: '96px',
        paddingBottom: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        // `backwards`, not `both` - `both` keeps the keyframe transform
        // applied after the fade ends, which makes this <main> a permanent
        // stacking context and traps the fixed-position meme modal under
        // the navbar. `backwards` plays the same fade and leaves no transform.
        animation: 'blogFadeIn 0.35s ease backwards',
      }}
    >
      <h1
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(2rem, 6vw, 3rem)',
          color: 'var(--accent)',
          marginBottom: '24px',
        }}
      >
        404
      </h1>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '1.1rem',
          color: 'var(--text-muted)',
          marginBottom: '28px',
          maxWidth: '540px',
        }}
      >
        {msg}
      </p>

      <div
        key={meme?.url ?? 'meme-slot'}
        style={{
          width: 'min(360px, 84vw)',
          minHeight: '160px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          animation: 'memeFadeIn 0.3s ease both',
        }}
      >
        {memeLoading ? (
          <div style={{ padding: '40px 0', color: 'var(--text-dim)' }}>
            <Loader2 size={22} className="spin" />
          </div>
        ) : meme ? (
          <div style={{ position: 'relative', width: '100%' }}>
            {!imgReady && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '160px', color: 'var(--text-dim)',
              }}>
                <Loader2 size={22} className="spin" />
              </div>
            )}
            <img
              src={meme.url}
              alt={meme.title}
              onClick={() => setModalOpen(true)}
              title="Click to view full size"
              style={{
                width: '100%',
                cursor: 'zoom-in',
                maxHeight: '360px',
                // contain, not cover - cover crops anything taller than the
                // box (a lot of memes are tall multi-panel images), which
                // was cutting off the top and bottom of the image.
                objectFit: 'contain',
                display: 'block',
                opacity: imgReady ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
              onLoad={() => setImgReady(true)}
              onError={() => setMemes(prev => prev.filter((_, i) => i !== index))}
            />
          </div>
        ) : (
          <div style={{
            padding: '40px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            color: 'var(--text-dim)',
          }}>
            <ImageOff size={22} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
              no memes today, api's shy
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '18px' }}>
        <button
          onClick={shuffleAll}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.9rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
        >
          <Shuffle size={14} /> Another one
        </button>
        <Link
          to="/"
          style={{
            padding: '10px 18px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.9rem',
            background: 'var(--accent)',
            // Hardcoded black read fine in dark mode (bright green button)
            // but was low-contrast in light mode (deeper green button) -
            // same theme-aware pair already used for the chat send button.
            color: 'var(--chat-user-text)',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Take me home
        </Link>
      </div>

      {modalOpen && meme && (
        <MemeModal
          meme={meme}
          index={index}
          total={memes.length}
          onPrev={index > 0 ? () => setIndex(i => i - 1) : undefined}
          onNext={index < memes.length - 1 ? () => setIndex(i => i + 1) : undefined}
          onShuffle={shuffleAll}
          onClose={() => setModalOpen(false)}
        />
      )}

      <style>{`
        @keyframes blogFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes memeFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
