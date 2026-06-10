import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

type Grid = number[][];
const SIZE = 4;
const BEST_KEY = 'dhruv_2048_best';

const emptyGrid = (): Grid => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
const clone = (g: Grid): Grid => g.map(r => [...r]);
const transpose = (g: Grid): Grid => g[0].map((_, c) => g.map(r => r[c]));
const reverseRows = (g: Grid): Grid => g.map(r => [...r].reverse());

function spawn(g: Grid): Grid {
  const empties: [number, number][] = [];
  g.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (!empties.length) return g;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const ng = clone(g);
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}

function slideLeft(g: Grid): { grid: Grid; gained: number; moved: boolean } {
  let gained = 0;
  const ng = g.map(row => {
    const arr = row.filter(v => v !== 0);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) { arr[i] *= 2; gained += arr[i]; arr.splice(i + 1, 1); }
    }
    while (arr.length < SIZE) arr.push(0);
    return arr;
  });
  const moved = JSON.stringify(ng) !== JSON.stringify(g);
  return { grid: ng, gained, moved };
}

function moveGrid(g: Grid, dir: 'left' | 'right' | 'up' | 'down') {
  if (dir === 'left') return slideLeft(g);
  if (dir === 'right') {
    const r = slideLeft(reverseRows(g));
    return { ...r, grid: reverseRows(r.grid) };
  }
  if (dir === 'up') {
    const r = slideLeft(transpose(g));
    return { ...r, grid: transpose(r.grid) };
  }
  const r = slideLeft(reverseRows(transpose(g)));
  return { ...r, grid: transpose(reverseRows(r.grid)) };
}

function isGameOver(g: Grid): boolean {
  return (['left', 'right', 'up', 'down'] as const).every(d => !moveGrid(g, d).moved);
}

const TILE: Record<number, { bg: string; fg: string }> = {
  0: { bg: 'var(--surface-2)', fg: 'transparent' },
  2: { bg: '#1d3a28', fg: '#DFF0E3' },
  4: { bg: '#244a32', fg: '#DFF0E3' },
  8: { bg: '#2f6b41', fg: '#fff' },
  16: { bg: '#2f8a50', fg: '#fff' },
  32: { bg: '#1fae5e', fg: '#06140c' },
  64: { bg: '#00d96d', fg: '#06140c' },
  128: { bg: '#f5c542', fg: '#06140c' },
  256: { bg: '#f4b73a', fg: '#06140c' },
  512: { bg: '#f0a92e', fg: '#06140c' },
  1024: { bg: '#ee9b1f', fg: '#06140c' },
  2048: { bg: '#ff8c1a', fg: '#06140c' },
};

function init(): Grid { return spawn(spawn(emptyGrid())); }

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(init);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const doMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    if (over) return;
    setGrid(prev => {
      const { grid: ng, gained, moved } = moveGrid(prev, dir);
      if (!moved) return prev;
      const withTile = spawn(ng);
      setScore(s => {
        const ns = s + gained;
        setBest(b => { const nb = Math.max(b, ns); localStorage.setItem(BEST_KEY, String(nb)); return nb; });
        return ns;
      });
      if (!won && withTile.some(r => r.includes(2048))) setWon(true);
      if (isGameOver(withTile)) setOver(true);
      return withTile;
    });
  }, [over, won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  const restart = () => { setGrid(init()); setScore(0); setOver(false); setWon(false); };

  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    touch.current = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px', alignItems: 'center' }}>
        <Stat label="score" value={score} />
        <Stat label="best" value={best} />
        <button onClick={restart} className="game-btn" style={{ marginLeft: 'auto' }}>
          <RotateCcw size={14} /> new
        </button>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          width: 'min(360px, 86vw)', aspectRatio: '1',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '10px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
          touchAction: 'none', userSelect: 'none',
        }}
      >
        {grid.flat().map((v, i) => {
          const t = TILE[v] ?? TILE[2048];
          return (
            <div key={i} style={{
              background: t.bg, color: t.fg, borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: v >= 1024 ? '1.15rem' : v >= 128 ? '1.4rem' : '1.7rem',
              transition: 'background 0.12s ease',
            }}>{v || ''}</div>
          );
        })}

        {(over || won) && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '10px',
            background: 'rgba(7,17,10,0.78)', backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.6rem', color: won && !over ? 'var(--accent)' : '#DFF0E3' }}>
              {won && !over ? 'You hit 2048!' : 'Game over'}
            </div>
            <button onClick={won && !over ? () => setWon(false) : restart} className="game-btn">
              {won && !over ? 'keep going' : 'try again'}
            </button>
          </div>
        )}
      </div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>
        arrow keys / WASD / swipe
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
      padding: '6px 14px', textAlign: 'center', minWidth: '74px',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
