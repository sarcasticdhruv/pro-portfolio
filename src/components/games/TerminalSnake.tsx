import { useEffect, useRef, useState, useCallback } from 'react';

const W = 28, H = 14, SPEED = 120;
type P = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
const D: Record<Dir, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function spawnFood(snake: P[]): P {
  while (true) {
    const f = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
  }
}

/** A tiny ASCII snake rendered with the terminal's own monospace styling. */
export default function TerminalSnake({ onExit }: { onExit: (score: number) => void }) {
  const snake = useRef<P[]>([{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }]);
  const dir = useRef<Dir>('right');
  const queued = useRef<Dir[]>([]);
  const food = useRef<P>(spawnFood(snake.current));
  const score = useRef(0);
  const over = useRef(false);
  const [, setFrame] = useState(0);
  const render = useCallback(() => setFrame(f => f + 1), []);

  const restart = useCallback(() => {
    snake.current = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
    dir.current = 'right';
    queued.current = [];
    food.current = spawnFood(snake.current);
    score.current = 0;
    over.current = false;
    render();
  }, [render]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'q' || k === 'escape') { e.preventDefault(); onExit(score.current); return; }
      if (over.current) {
        if (k === 'r') { e.preventDefault(); restart(); }
        else if (k === 'enter') { e.preventDefault(); onExit(score.current); }
        return;
      }
      const map: Record<string, Dir> = {
        arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const nd = map[k];
      if (nd) {
        e.preventDefault();
        const last = queued.current[queued.current.length - 1] ?? dir.current;
        if (nd !== last && nd !== OPP[last]) queued.current.push(nd);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, restart]);

  useEffect(() => {
    const id = setInterval(() => {
      if (over.current) return;
      if (queued.current.length) dir.current = queued.current.shift()!;
      const head = snake.current[0];
      const nx = head.x + D[dir.current].x;
      const ny = head.y + D[dir.current].y;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || snake.current.some(s => s.x === nx && s.y === ny)) {
        over.current = true;
        render();
        return;
      }
      const nh = { x: nx, y: ny };
      snake.current.unshift(nh);
      if (nx === food.current.x && ny === food.current.y) {
        score.current += 1;
        food.current = spawnFood(snake.current);
      } else {
        snake.current.pop();
      }
      render();
    }, SPEED);
    return () => clearInterval(id);
  }, [render]);

  // Build the grid as colored rows.
  const rows: React.ReactNode[] = [];
  for (let y = 0; y < H; y++) {
    const cells: React.ReactNode[] = [];
    for (let x = 0; x < W; x++) {
      const isHead = snake.current[0].x === x && snake.current[0].y === y;
      const isBody = !isHead && snake.current.some(s => s.x === x && s.y === y);
      const isFood = food.current.x === x && food.current.y === y;
      if (isHead) cells.push(<span key={x} style={{ color: '#00F07A' }}>@</span>);
      else if (isBody) cells.push(<span key={x} style={{ color: '#00D96D' }}>o</span>);
      else if (isFood) cells.push(<span key={x} style={{ color: '#FEBC2E' }}>*</span>);
      else cells.push(<span key={x} style={{ color: '#13251a' }}>·</span>);
    }
    rows.push(<div key={y} style={{ whiteSpace: 'pre', lineHeight: 1.1 }}>{cells}</div>);
  }

  const border = '─'.repeat(W);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', userSelect: 'none', padding: '4px 0' }}>
      <div style={{ color: '#6E8C76', display: 'flex', justifyContent: 'space-between', maxWidth: `${W}ch` }}>
        <span>snake</span>
        <span>score: <span style={{ color: '#00D96D' }}>{score.current}</span></span>
      </div>
      <div style={{ color: '#3E6E4E', whiteSpace: 'pre' }}>┌{border}┐</div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ color: '#3E6E4E', whiteSpace: 'pre' }}>{Array.from({ length: H }, (_, i) => <div key={i} style={{ lineHeight: 1.1 }}>│</div>)}</div>
          <div>{rows}</div>
          <div style={{ color: '#3E6E4E', whiteSpace: 'pre' }}>{Array.from({ length: H }, (_, i) => <div key={i} style={{ lineHeight: 1.1 }}>│</div>)}</div>
        </div>
        {over.current && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '4px',
            background: 'rgba(5,13,8,0.82)',
          }}>
            <div style={{ color: '#FF6B6B', fontWeight: 600 }}>game over · score {score.current}</div>
            <div style={{ color: '#6E8C76', fontSize: '0.74rem' }}>press <span style={{ color: '#00D96D' }}>R</span> to retry · <span style={{ color: '#00D96D' }}>Enter</span> to exit</div>
          </div>
        )}
      </div>
      <div style={{ color: '#3E6E4E', whiteSpace: 'pre' }}>└{border}┘</div>
      <div style={{ color: '#6E8C76', marginTop: '4px', fontSize: '0.74rem' }}>
        move: <span style={{ color: '#00D96D' }}>↑ ↓ ← →</span> / WASD · quit: <span style={{ color: '#00D96D' }}>Q</span>
      </div>
    </div>
  );
}
