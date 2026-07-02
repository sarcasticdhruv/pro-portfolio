import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, LayoutGrid, Hash } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Game2048 from '../components/games/Game2048';
import SnakeGame from '../components/games/SnakeGame';
import TicTacToe from '../components/games/TicTacToe';

type GameKey = 'snake' | '2048' | 'ttt';

const GAMES: {
  key: GameKey; name: string; tag: string; Icon: LucideIcon; desc: string; hint: string;
}[] = [
  { key: 'snake', name: 'Snake', tag: 'classic', Icon: Zap,
    desc: 'Eat, grow, don\'t crash.', hint: 'arrows / WASD · swipe · space to pause' },
  { key: '2048', name: '2048', tag: 'puzzle', Icon: LayoutGrid,
    desc: 'Slide tiles, reach 2048.', hint: 'arrows / WASD · swipe on mobile' },
  { key: 'ttt', name: 'Tic-Tac-Toe', tag: 'vs AI', Icon: Hash,
    desc: 'Beat the AI. You are X.', hint: 'tap or click a square' },
];

export default function GamesPage() {
  const [active, setActive] = useState<GameKey>('snake');
  const current = GAMES.find(g => g.key === active)!;

  useEffect(() => {
    document.title = 'Arcade · Dhruv Choudhary';
    return () => { document.title = 'Dhruv Choudhary · AI Engineer'; };
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: '80px',
      animation: 'gamesFadeIn 0.35s ease both',
    }}>
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 24px)' }}>

        {/* Breadcrumb */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.67rem',
          color: 'var(--text-dim)', letterSpacing: '0.05em',
          marginBottom: '30px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>~/dhruv</Link>
          <span>/</span>
          <span>arcade</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.9rem, 6vw, 2.8rem)',
            letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.05,
            marginBottom: '10px',
          }}>
            Arcade<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem',
            color: 'var(--text-muted)', lineHeight: 1.65,
          }}>
            Three small games. Built from scratch, no libraries.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '20px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '4px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {GAMES.map(g => {
            const on = active === g.key;
            return (
              <button
                key={g.key}
                onClick={() => setActive(g.key)}
                style={{
                  flex: 1, border: 'none', cursor: 'pointer',
                  background: on ? 'var(--accent)' : 'transparent',
                  borderRadius: '10px',
                  padding: '10px 6px 8px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '4px',
                  transition: 'background 0.2s ease, color 0.2s ease',
                  color: on ? 'var(--bg)' : 'var(--text-muted)',
                }}
              >
                <g.Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.72rem', fontWeight: on ? 700 : 500, lineHeight: 1,
                }}>{g.name}</span>
                <span style={{
                  fontSize: '0.52rem', textTransform: 'uppercase',
                  letterSpacing: '0.08em', opacity: on ? 0.7 : 0.45,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{g.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Info strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '14px', padding: '0 2px',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
            color: 'var(--text-dim)',
          }}>{current.desc}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
            color: 'var(--accent)', background: 'var(--accent-glow)',
            border: '1px solid var(--tag-border)',
            borderRadius: '100px', padding: '2px 9px',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{current.tag}</span>
        </div>

        {/* Game card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: 'clamp(20px, 5vw, 36px)',
          display: 'flex', justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          minHeight: '360px',
          alignItems: 'center',
        }}>
          {active === 'snake' && <SnakeGame />}
          {active === '2048' && <Game2048 />}
          {active === 'ttt' && <TicTacToe />}
        </div>

        {/* Controls */}
        <p style={{
          textAlign: 'center', marginTop: '14px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.63rem', color: 'var(--text-dim)',
          letterSpacing: '0.02em',
        }}>{current.hint}</p>
      </div>

      <style>{`
        @keyframes gamesFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .game-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--surface-2); border: 1px solid var(--border-2);
          border-radius: 8px; padding: 7px 14px; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 0.73rem; font-weight: 600;
          color: var(--text); transition: border-color 0.15s, color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .game-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
        .dpad-btn {
          background: var(--surface-2); border: 1px solid var(--border-2);
          border-radius: 8px; cursor: pointer; color: var(--text);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; width: 44px; height: 44px;
          transition: background 0.12s, border-color 0.12s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .dpad-btn:active { background: var(--accent-glow); border-color: var(--accent); color: var(--accent); }
      `}</style>
    </main>
  );
}
