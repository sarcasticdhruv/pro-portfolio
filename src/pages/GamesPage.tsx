import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import Game2048 from '../components/games/Game2048';
import SnakeGame from '../components/games/SnakeGame';
import TicTacToe from '../components/games/TicTacToe';

type GameKey = '2048' | 'snake' | 'ttt';

const GAMES: { key: GameKey; name: string; tag: string }[] = [
  { key: 'snake', name: 'Snake', tag: 'classic' },
  { key: '2048', name: '2048', tag: 'puzzle' },
  { key: 'ttt', name: 'Tic-Tac-Toe', tag: 'vs AI' },
];

export default function GamesPage() {
  const [active, setActive] = useState<GameKey>('snake');

  useEffect(() => {
    document.title = 'Games - Dhruv Choudhary';
    return () => { document.title = 'Dhruv Choudhary - AI Engineer'; };
  }, []);

  return (
    <main style={{
      minHeight: '100vh', paddingTop: '96px', paddingBottom: '80px',
      animation: 'gamesFadeIn 0.35s ease both',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px' }}>
        {/* Breadcrumb */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
          color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>~/dhruv</Link>
          <span>/</span><span>games</span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <Gamepad2 size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', letterSpacing: '-0.03em',
            color: 'var(--text)', lineHeight: 1.1,
          }}>Arcade</h1>
        </div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.97rem', lineHeight: 1.72,
          color: 'var(--text-muted)', maxWidth: '540px', marginBottom: '32px',
        }}>
          A few small games to waste a minute. Built from scratch, no libraries.
        </p>

        {/* Selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {GAMES.map(g => {
            const on = active === g.key;
            return (
              <button
                key={g.key}
                onClick={() => setActive(g.key)}
                style={{
                  background: on ? 'var(--accent)' : 'var(--surface)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '10px', padding: '8px 16px', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem',
                  color: on ? '#06140c' : 'var(--text-muted)', fontWeight: on ? 700 : 500,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
              >
                {g.name}
                <span style={{
                  fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{g.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Game surface */}
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: 'clamp(18px, 4vw, 32px)',
          display: 'flex', justifyContent: 'center',
        }}>
          {active === 'snake' && <SnakeGame />}
          {active === '2048' && <Game2048 />}
          {active === 'ttt' && <TicTacToe />}
        </div>
      </div>

      <style>{`
        @keyframes gamesFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .game-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--surface); border: 1px solid var(--border-2);
          border-radius: 8px; padding: 7px 14px; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 0.74rem; font-weight: 600;
          color: var(--text); transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .game-btn:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>
    </main>
  );
}
