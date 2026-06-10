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

// Beatable-but-decent AI: win > block > center > corner > random.
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
  const [turn, setTurn] = useState<'X' | 'O'>('X'); // player is X
  const [scores, setScores] = useState({ you: 0, ai: 0, draw: 0 });

  const win = winner(board);
  const full = board.every(Boolean);
  const done = !!win || full;

  const play = useCallback((i: number) => {
    if (board[i] || done || turn !== 'X') return;
    const nb = [...board]; nb[i] = 'X';
    setBoard(nb); setTurn('O');
  }, [board, done, turn]);

  // AI responds
  useEffect(() => {
    if (turn !== 'O' || done) return;
    const id = setTimeout(() => {
      setBoard(prev => {
        if (winner(prev) || prev.every(Boolean)) return prev;
        const nb = [...prev]; nb[aiMove(prev)] = 'O';
        return nb;
      });
      setTurn('X');
    }, 380);
    return () => clearTimeout(id);
  }, [turn, done]);

  // Tally on finish
  useEffect(() => {
    if (!done) return;
    setScores(s => {
      if (win?.who === 'X') return { ...s, you: s.you + 1 };
      if (win?.who === 'O') return { ...s, ai: s.ai + 1 };
      return { ...s, draw: s.draw + 1 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const reset = () => { setBoard(Array(9).fill(null)); setTurn('X'); };

  const status = win ? (win.who === 'X' ? 'You win' : 'AI wins') : full ? 'Draw' : turn === 'X' ? 'Your move' : 'AI thinking…';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '320px', alignItems: 'center' }}>
        <Stat label="you" value={scores.you} />
        <Stat label="draw" value={scores.draw} />
        <Stat label="ai" value={scores.ai} />
        <button onClick={reset} className="game-btn" style={{ marginLeft: 'auto' }}><RotateCcw size={14} /></button>
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem',
        color: win?.who === 'X' ? 'var(--accent)' : 'var(--text-muted)', height: '1.2em',
      }}>{status}</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
        width: 'min(300px, 80vw)', aspectRatio: '1',
      }}>
        {board.map((c, i) => {
          const hl = win?.line.includes(i);
          return (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={!!c || done || turn !== 'X'}
              style={{
                background: hl ? 'var(--accent-glow-strong)' : 'var(--surface)',
                border: `1px solid ${hl ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '10px',
                cursor: !c && !done && turn === 'X' ? 'pointer' : 'default',
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '2.4rem',
                color: c === 'X' ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >{c}</button>
          );
        })}
      </div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>
        you are X · tap a square
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
      padding: '6px 12px', textAlign: 'center', minWidth: '58px',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.56rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
