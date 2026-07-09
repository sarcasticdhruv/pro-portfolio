import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Trophy, XCircle } from 'lucide-react';

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

function moveGrid(g: Grid, d: 'left' | 'right' | 'up' | 'down') {
  if (d === 'left') return slideLeft(g);
  if (d === 'right') { const r = slideLeft(reverseRows(g)); return { ...r, grid: reverseRows(r.grid) }; }
  if (d === 'up') { const r = slideLeft(transpose(g)); return { ...r, grid: transpose(r.grid) }; }
  const r = slideLeft(reverseRows(transpose(g)));
  return { ...r, grid: transpose(reverseRows(r.grid)) };
}

function isGameOver(g: Grid) {
  return (['left', 'right', 'up', 'down'] as const).every(d => !moveGrid(g, d).moved);
}

// Dark-mode palette (current)
const TILE_DARK: Record<number, { bg: string; fg: string }> = {
  0:    { bg: 'rgba(0,0,0,0)',    fg: 'transparent' },
  2:    { bg: '#1d3a28',          fg: '#a8d8b4' },
  4:    { bg: '#244a32',          fg: '#b8e0c2' },
  8:    { bg: '#2f6b41',          fg: '#d4f0dc' },
  16:   { bg: '#2f8a50',          fg: '#e0f5e8' },
  32:   { bg: '#1fae5e',          fg: '#05110a' },
  64:   { bg: '#00d96d',          fg: '#03100a' },
  128:  { bg: '#f5c542',          fg: '#06140c' },
  256:  { bg: '#f4b73a',          fg: '#06140c' },
  512:  { bg: '#f0a92e',          fg: '#06140c' },
  1024: { bg: '#ee9b1f',          fg: '#06140c' },
  2048: { bg: '#ff8c1a',          fg: '#06140c' },
};

// Light-mode palette
const TILE_LIGHT: Record<number, { bg: string; fg: string }> = {
  0:    { bg: '#e8e6df',          fg: 'transparent' },
  2:    { bg: '#d4edda',          fg: '#1e4530' },
  4:    { bg: '#bde2c6',          fg: '#163827' },
  8:    { bg: '#8ecf9e',          fg: '#0d2c1c' },
  16:   { bg: '#55b872',          fg: '#06140c' },
  32:   { bg: '#1ea84e',          fg: '#ffffff' },
  64:   { bg: '#007a3d',          fg: '#ffffff' },
  128:  { bg: '#c8960c',          fg: '#ffffff' },
  256:  { bg: '#b57e00',          fg: '#ffffff' },
  512:  { bg: '#9e6700',          fg: '#ffffff' },
  1024: { bg: '#8a5200',          fg: '#ffffff' },
  2048: { bg: '#e05a00',          fg: '#ffffff' },
};

function useDarkMode() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') !== 'light'
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute('data-theme') !== 'light')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const init = (): Grid => spawn(spawn(emptyGrid()));

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(init);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const dark = useDarkMode();
  const TILE = dark ? TILE_DARK : TILE_LIGHT;

  const doMove = useCallback((d: 'left' | 'right' | 'up' | 'down') => {
    if (over) return;
    setGrid(prev => {
      const { grid: ng, gained, moved } = moveGrid(prev, d);
      if (!moved) return prev;
      const next = spawn(ng);
      setScore(s => {
        const ns = s + gained;
        setBest(b => { const nb = Math.max(b, ns); localStorage.setItem(BEST_KEY, String(nb)); return nb; });
        return ns;
      });
      if (!won && next.some(r => r.includes(2048))) setWon(true);
      if (isGameOver(next)) setOver(true);
      return next;
    });
  }, [over, won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      const d = map[e.key];
      if (d) { e.preventDefault(); doMove(d); }
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

  const overlayBg = dark ? 'rgba(7,17,10,0.88)' : 'rgba(245,244,238,0.92)';
  const overlayText = dark ? '#DFF0E3' : '#0E1A11';
  const boardBg = dark ? '#0D1A10' : '#E8E6DF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
      {/* Score row */}
      <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '360px', alignItems: 'center' }}>
        <GameStat label="score" value={score} accent />
        <GameStat label="best" value={best} />
        <button onClick={restart} className="game-btn" style={{ marginLeft: 'auto' }}>
          <RotateCcw size={13} /> new game
        </button>
      </div>

      {/* Board */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          width: 'min(340px, 84vw)',
          aspectRatio: '1',
          background: boardBg,
          borderRadius: '14px',
          padding: '10px',
          display: 'grid',
          // minmax(0, 1fr) on BOTH axes, not bare 1fr - a bare 1fr track
          // won't shrink below its content's min-content size, so rows/
          // columns with a bigger tile number would stay larger than
          // emptier ones.
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
          gap: '8px',
          touchAction: 'none',
          userSelect: 'none',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {grid.flat().map((v, i) => {
          const t = TILE[v] ?? TILE[2048];
          return (
            <div
              key={i}
              style={{
                background: t.bg,
                color: t.fg,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: v >= 1024 ? 'clamp(0.85rem, 3.5vw, 1.1rem)' : v >= 128 ? 'clamp(1rem, 4vw, 1.35rem)' : 'clamp(1.1rem, 4.5vw, 1.6rem)',
                transition: 'background 0.12s ease',
                boxShadow: v >= 64 ? `0 2px 8px ${t.bg}66` : 'none',
              }}
            >{v || ''}</div>
          );
        })}

        {(over || won) && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '14px',
            background: overlayBg,
            backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            {won && !over
              ? <Trophy size={30} color="var(--accent)" strokeWidth={1.5} />
              : <XCircle size={30} color="#FF6B6B" strokeWidth={1.5} />}
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: won && !over ? 'var(--accent)' : overlayText }}>
              {won && !over ? 'You hit 2048!' : 'Game Over'}
            </div>
            <button onClick={won && !over ? () => setWon(false) : restart} className="game-btn">
              {won && !over ? 'keep going' : 'try again'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GameStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'var(--accent-glow)' : 'var(--surface-2)',
      border: `1px solid ${accent ? 'var(--tag-border)' : 'var(--border)'}`,
      borderRadius: '10px', padding: '8px 16px', textAlign: 'center', minWidth: '72px',
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.56rem',
        color: accent ? 'var(--accent)' : 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px',
      }}>{label}</div>
      <div style={{
        // Syne's digits at heavy weight render as an odd wide pill shape at
        // this size - JetBrains Mono (already used for the label above)
        // gives crisp, legible numerals instead.
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.2rem',
        color: accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}
