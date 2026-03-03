import { useState } from 'react';
import { Link } from 'react-router-dom';

// a small list of playful/techy 404 messages; shuffled each render
const messages = [
  'Oops! This page escaped our neural network.',
  '404: Even AI can’t find this.',
  'The page you’re looking for went on a coffee break.',
  'Looks like you wandered into the void… 🕳️',
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

export default function NotFoundPage() {
  const [msg, setMsg] = useState(() => pickRandom());

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
          marginBottom: '32px',
          maxWidth: '540px',
        }}
      >
        {msg}
      </p>

      <div style={{ display: 'flex', gap: '18px' }}>
        <button
          onClick={() => setMsg(pickRandom())}
          style={{
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
          Another one
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
      `}</style>
    </main>
  );
}
