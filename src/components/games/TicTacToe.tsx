import { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

type Cell = 'X' | 'O' | null;
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winner(b: Cell[]): { who: Cell; line: number[] } | null {
  for (const l of LINES) {
    const [a, c, d] = l;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: l };
  }
  return null;
}

function aiMove(b: Cell[]): number {
  const empty = b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  const tryWin = (who: Cell) => {
    for (const i of empty) {
      const copy = [...b]; copy[i] = who;
      if (winner(copy)?.who === who) return i;
    }
    return -1;
  };
  const win = tryWin('O'); if (win >= 0) return win;
  const block = tryWin('X'); if (block >= 0) return block;
  if (b[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter(i => b[i] === null);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [scores, setScores] = useState({ you: 0, ai: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);

  const win = winner(board);
  const full = board.every(Boolean);
  const done = !!win || full;

  const play = useCallback((i: number) => {
    if (board[i] || done || turn !== 'X' || thinking) return;
    const nb = [...board]; nb[i] = 'X';
    setBoard(nb); setTurn('O');
  }, [board, done, turn, thinking]);

  useEffect(() => {
    if (turn !== 'O' || done) return;
    setThinking(true);
    const id = setTimeout(() => {
      setBoard(prev => {
        if (winner(prev) || prev.every(Boolean)) return prev;
        const nb = [...prev]; nb[aiMove(prev)] = 'O';
        return nb;
      });
      setTurn('X');
      setThinking(false);
    }, 420);
    return () => clearTimeout(id);
  }, [turn, done]);

  useEffect(() => {
    if (!done) return;
    setScores(s => {
      if (win?.who === 'X') return { ...s, you: s.you + 1 };
      if (win?.who === 'O') return { ...s, ai: s.ai + 1 };
      return { ...s, draw: s.draw + 1 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const reset = () => { setBoard(Array(9).fill(null)); setTurn('X'); setThinking(false); };

  const statusText = win
    ? win.who === 'X' ? 'You win!' : 'AI wins'
    : full ? 'Draw'
    : thinking ? 'AI thinking...'
    : 'Your move';

  const statusColor = win?.who === 'X'
    ? 'var(--accent)'
    : win?.who === 'O'
      ? '#FF6B6B'
      : full
        ? 'var(--text-dim)'
        : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
      {/* Score row */}
      <div style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '340px', alignItems: 'center' }}>
        <GameStat label="you" value={scores.you} color="var(--accent)" />
        <GameStat label="draw" value={scores.draw} />
        <GameStat label="ai" value={scores.ai} color="#FF6B6B" />
        <button onClick={reset} className="game-btn" style={{ marginLeft: 'auto' }}>
          <RotateCcw size={13} /> reset
        </button>
      </div>

      {/* Status */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.8rem',
        color: statusColor,
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'color 0.2s',
      }}>
        {thinking && (
          <span style={{ display: 'inline-flex', gap: '3px' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: 'var(--text-dim)',
                display: 'inline-block',
                animation: `ttcDot 0.9s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </span>
        )}
        {statusText}
      </div>

      {/* Board */}
      <div style={{
        display: 'grid',
        // minmax(0, 1fr) on BOTH axes, not bare 1fr - a bare 1fr track
        // won't shrink below its content's min-content size, so a square
        // holding an X/O stayed a bit wider/taller than an empty one.
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
        width: 'min(300px, 80vw)',
        aspectRatio: '1',
      }}>
        {board.map((c, i) => {
          const hl = win?.line.includes(i);
          const canPlay = !c && !done && turn === 'X' && !thinking;
          return (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={!canPlay}
              style={{
                background: hl
                  ? (win?.who === 'X' ? 'var(--accent-glow-strong)' : 'rgba(255,107,107,0.15)')
                  : c
                    ? 'var(--surface-2)'
                    : canPlay
                      ? 'var(--surface)'
                      : 'var(--surface-2)',
                border: `2px solid ${
                  hl
                    ? (win?.who === 'X' ? 'var(--accent)' : '#FF6B6B')
                    : c
                      ? 'var(--border-2)'
                      : canPlay
                        ? 'var(--border-2)'
                        : 'var(--border)'
                }`,
                borderRadius: '12px',
                cursor: canPlay ? 'pointer' : 'default',
                fontFamily: "'Syne', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(1.6rem, 8vw, 2.4rem)',
                color: c === 'X'
                  ? hl ? 'var(--accent)' : 'var(--accent)'
                  : c === 'O'
                    ? hl ? '#FF6B6B' : 'var(--text-muted)'
                    : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
                transform: hl ? 'scale(1.04)' : 'scale(1)',
                boxShadow: hl ? `0 4px 16px ${win?.who === 'X' ? 'var(--accent-glow-strong)' : 'rgba(255,107,107,0.2)'}` : 'none',
              }}
              onMouseEnter={e => {
                if (canPlay) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-dim)';
              }}
              onMouseLeave={e => {
                if (!hl) (e.currentTarget as HTMLElement).style.borderColor = c ? 'var(--border-2)' : 'var(--border)';
              }}
            >{c}</button>
          );
        })}
      </div>

      {done && (
        <button onClick={reset} className="game-btn">
          <RotateCcw size={13} /> play again
        </button>
      )}

      <style>{`
        @keyframes ttcDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function GameStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: color ? `${color}12` : 'var(--surface-2)',
      border: `1px solid ${color ? `${color}30` : 'var(--border)'}`,
      borderRadius: '10px', padding: '7px 14px', textAlign: 'center', minWidth: '64px',
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem',
        color: color ?? 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px',
      }}>{label}</div>
      <div style={{
        // Syne's digits at heavy weight render as an odd wide pill shape at
        // this size - JetBrains Mono (already used for the label above)
        // gives crisp, legible numerals instead.
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.15rem',
        color: color ?? 'var(--text)', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}
