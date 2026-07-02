import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Play, Pause, XCircle } from 'lucide-react';

const CELLS = 17;
const SPEED = 120;
const BEST_KEY = 'dhruv_snake_best';

type P = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
const DELTA: Record<Dir, P> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function randFood(snake: P[]): P {
  while (true) {
    const f = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
  }
}

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

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const dark = useDarkMode();

  const snake = useRef<P[]>([{ x: 8, y: 8 }]);
  const dir = useRef<Dir>('right');
  const queued = useRef<Dir[]>([]);
  const food = useRef<P>(randFood(snake.current));
  const acc = useRef(0);
  const lastTs = useRef(0);
  const raf = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    snake.current = [{ x: 8, y: 8 }];
    dir.current = 'right';
    queued.current = [];
    food.current = randFood(snake.current);
    acc.current = 0;
    setScore(0);
    setOver(false);
    setRunning(true);
  }, []);

  const turn = useCallback((d: Dir) => {
    const last = queued.current[queued.current.length - 1] ?? dir.current;
    if (d === last || d === OPPOSITE[last]) return;
    queued.current.push(d);
    if (!running && !over) setRunning(true);
  }, [running, over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      if (e.key === ' ') { e.preventDefault(); if (!over) setRunning(r => !r); return; }
      const d = map[e.key];
      if (d) { e.preventDefault(); turn(d); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, over]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const size = canvas.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(size * dpr)) {
        canvas.width = Math.floor(size * dpr);
        canvas.height = Math.floor(size * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = size / CELLS;
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
      const gridLine = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();

      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      // Grid lines
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.6;
      for (let i = 1; i < CELLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Food
      const f = food.current;
      ctx.fillStyle = '#f5c542';
      ctx.shadowColor = '#f5c54288'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(f.x * cell + cell / 2, f.y * cell + cell / 2, cell * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake
      snake.current.forEach((s, i) => {
        const isHead = i === snake.current.length - 1;
        ctx.globalAlpha = isHead ? 1 : 0.35 + 0.62 * (i / snake.current.length);
        ctx.fillStyle = isHead ? accent : accent;
        if (isHead) { ctx.shadowColor = accent + '66'; ctx.shadowBlur = 8; }
        const pad = cell * 0.1;
        roundRect(ctx, s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.28);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    };

    const step = () => {
      if (queued.current.length) dir.current = queued.current.shift()!;
      const head = snake.current[snake.current.length - 1];
      const nx = head.x + DELTA[dir.current].x;
      const ny = head.y + DELTA[dir.current].y;
      if (nx < 0 || ny < 0 || nx >= CELLS || ny >= CELLS ||
        snake.current.some(s => s.x === nx && s.y === ny)) {
        setRunning(false); setOver(true); return;
      }
      snake.current.push({ x: nx, y: ny });
      if (nx === food.current.x && ny === food.current.y) {
        food.current = randFood(snake.current);
        setScore(s => {
          const ns = s + 1;
          setBest(b => { const nb = Math.max(b, ns); localStorage.setItem(BEST_KEY, String(nb)); return nb; });
          return ns;
        });
      } else {
        snake.current.shift();
      }
    };

    const tick = (ts: number) => {
      if (!lastTs.current) lastTs.current = ts;
      const dt = ts - lastTs.current;
      lastTs.current = ts;
      if (running && !over) {
        acc.current += dt;
        while (acc.current >= SPEED) { acc.current -= SPEED; step(); }
      }
      draw();
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, over]);

  const overlayBg = dark ? 'rgba(7,17,10,0.86)' : 'rgba(245,244,238,0.9)';
  const overlayText = dark ? '#DFF0E3' : '#0E1A11';

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    touchStart.current = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
      {/* Score row */}
      <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '360px', alignItems: 'center' }}>
        <GameStat label="score" value={score} accent />
        <GameStat label="best" value={best} />
        <button
          onClick={() => over ? reset() : setRunning(r => !r)}
          className="game-btn"
          style={{ marginLeft: 'auto' }}
        >
          {over
            ? <><RotateCcw size={13} /> restart</>
            : running
              ? <><Pause size={13} /> pause</>
              : <><Play size={13} /> play</>}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={wrapRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          width: 'min(340px, 84vw)',
          aspectRatio: '1',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {(!running && !over && score === 0) && (
          <Overlay bg={overlayBg}>
            <Play size={32} color="var(--accent)" strokeWidth={1.5} />
            <button onClick={() => setRunning(true)} className="game-btn"><Play size={13} /> start game</button>
          </Overlay>
        )}
        {(!running && !over && score > 0) && (
          <Overlay bg={overlayBg}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: overlayText, opacity: 0.7 }}>paused</span>
            <button onClick={() => setRunning(true)} className="game-btn"><Play size={13} /> resume</button>
          </Overlay>
        )}
        {over && (
          <Overlay bg={overlayBg}>
            <XCircle size={30} color="#FF6B6B" strokeWidth={1.5} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: overlayText }}>
              Game Over
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: overlayText, opacity: 0.6 }}>
              score: {score}
            </div>
            <button onClick={reset} className="game-btn"><RotateCcw size={13} /> try again</button>
          </Overlay>
        )}
      </div>

      {/* Mobile D-pad */}
      <div className="snake-dpad">
        <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 44px', gridTemplateRows: '44px 44px 44px', gap: '4px' }}>
          <div /><DpadBtn onClick={() => turn('up')}>↑</DpadBtn><div />
          <DpadBtn onClick={() => turn('left')}>←</DpadBtn>
          <div style={{ background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }} />
          <DpadBtn onClick={() => turn('right')}>→</DpadBtn>
          <div /><DpadBtn onClick={() => turn('down')}>↓</DpadBtn><div />
        </div>
      </div>

      <style>{`
        .snake-dpad { display: none; }
        @media (hover: none) { .snake-dpad { display: flex; } }
      `}</style>
    </div>
  );
}

function DpadBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="dpad-btn"
      onClick={onClick}
      onTouchStart={e => e.stopPropagation()}
    >{children}</button>
  );
}

function Overlay({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: bg,
      backdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '10px',
    }}>{children}</div>
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
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.3rem',
        color: accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
