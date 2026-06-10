import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Play, Pause } from 'lucide-react';

const CELLS = 17;        // grid is CELLS x CELLS
const SPEED = 120;       // ms per step
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

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const snake = useRef<P[]>([{ x: 8, y: 8 }]);
  const dir = useRef<Dir>('right');
  const queued = useRef<Dir[]>([]);
  const food = useRef<P>(randFood(snake.current));
  const acc = useRef(0);
  const lastTs = useRef(0);
  const raf = useRef(0);

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
    const lastQueued = queued.current[queued.current.length - 1] ?? dir.current;
    if (d === lastQueued || d === OPPOSITE[lastQueued]) return;
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

  // Game loop + render
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
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d96d';
      const surface2 = getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || '#132018';

      ctx.clearRect(0, 0, size, size);
      // subtle grid
      ctx.strokeStyle = surface2;
      ctx.lineWidth = 1;
      for (let i = 1; i < CELLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
      }
      // food
      const f = food.current;
      ctx.fillStyle = '#f5c542';
      ctx.shadowColor = '#f5c542'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(f.x * cell + cell / 2, f.y * cell + cell / 2, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // snake
      snake.current.forEach((s, i) => {
        const head = i === snake.current.length - 1;
        ctx.fillStyle = accent;
        ctx.globalAlpha = head ? 1 : 0.45 + 0.5 * (i / snake.current.length);
        const pad = cell * 0.12;
        roundRect(ctx, s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.22);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const step = () => {
      if (queued.current.length) dir.current = queued.current.shift()!;
      const head = snake.current[snake.current.length - 1];
      const nx = head.x + DELTA[dir.current].x;
      const ny = head.y + DELTA[dir.current].y;
      // wall or self collision
      if (nx < 0 || ny < 0 || nx >= CELLS || ny >= CELLS ||
          snake.current.some(s => s.x === nx && s.y === ny)) {
        setRunning(false);
        setOver(true);
        return;
      }
      const newHead = { x: nx, y: ny };
      snake.current.push(newHead);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px', alignItems: 'center' }}>
        <Stat label="score" value={score} />
        <Stat label="best" value={best} />
        <button onClick={() => (over ? reset() : setRunning(r => !r))} className="game-btn" style={{ marginLeft: 'auto' }}>
          {over ? <><RotateCcw size={14} /> new</> : running ? <><Pause size={14} /> pause</> : <><Play size={14} /> play</>}
        </button>
      </div>

      <div style={{ position: 'relative', width: 'min(360px, 86vw)', aspectRatio: '1' }}>
        <canvas ref={canvasRef} style={{
          width: '100%', height: '100%',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
        }} />
        {(!running && !over) && score === 0 && (
          <Overlay><button onClick={() => setRunning(true)} className="game-btn"><Play size={14} /> start</button></Overlay>
        )}
        {over && (
          <Overlay>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#DFF0E3' }}>Game over</div>
            <button onClick={reset} className="game-btn">try again</button>
          </Overlay>
        )}
      </div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>
        arrows / WASD · space to pause
      </p>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '10px',
      background: 'rgba(7,17,10,0.72)', backdropFilter: 'blur(2px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
    }}>{children}</div>
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
