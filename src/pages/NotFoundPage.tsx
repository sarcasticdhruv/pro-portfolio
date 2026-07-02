import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ImageOff, Shuffle } from 'lucide-react';

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

// Keyless, CORS-open meme feed. Retries across a small safe-for-work pool
// and skips anything flagged nsfw/spoiler.
const MEME_SUBS = ['ProgrammerHumor', 'programmingmemes', 'wholesomememes', 'memes'];

interface Meme { url: string; title: string; subreddit: string }

async function fetchMeme(): Promise<Meme | null> {
  for (let i = 0; i < 4; i++) {
    try {
      const sub = MEME_SUBS[Math.floor(Math.random() * MEME_SUBS.length)];
      const res = await fetch(`https://meme-api.com/gimme/${sub}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.nsfw || data.spoiler || !data.url) continue;
      return { url: data.url, title: data.title, subreddit: data.subreddit };
    } catch {
      return null;
    }
  }
  return null;
}

export default function NotFoundPage() {
  const [msg, setMsg] = useState(() => pickRandom());
  const [meme, setMeme] = useState<Meme | null>(null);
  const [memeLoading, setMemeLoading] = useState(true);
  const mounted = useRef(true);

  const loadMeme = useCallback(() => {
    setMemeLoading(true);
    fetchMeme().then(m => {
      if (!mounted.current) return;
      setMeme(m);
      setMemeLoading(false);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadMeme();
    return () => { mounted.current = false; };
  }, [loadMeme]);

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
        animation: 'blogFadeIn 0.35s ease both',
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
          <>
            <img
              src={meme.url}
              alt={meme.title}
              style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }}
              onError={() => setMeme(null)}
            />
            <div
              style={{
                width: '100%',
                padding: '8px 14px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
                textAlign: 'left',
                borderTop: '1px solid var(--border)',
              }}
            >
              r/{meme.subreddit}
            </div>
          </>
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
            color: '#000',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Take me home
        </Link>
      </div>

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
