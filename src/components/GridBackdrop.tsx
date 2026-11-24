// Site-wide graph-paper backdrop: a faint 64px grid fixed behind every page,
// plus an accent-colored copy of the grid that glows softly around the
// cursor. Blog pages skip it so long-form reading stays clean.
//
// Cursor position goes straight to CSS variables once per animation frame,
// so moving the mouse never re-renders React. The spotlight is disabled on
// touch screens and for people who prefer reduced motion.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const GRID = '64px 64px';
const LINES = (color: string) =>
  `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;

export default function GridBackdrop() {
  const { pathname } = useLocation();
  const hidden = pathname === '/blog' || pathname.startsWith('/blog/');
  const spotRef = useRef<HTMLDivElement>(null);

  const spotlightOn = typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!spotlightOn || hidden) return;
    let raf = 0;
    const move = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = spotRef.current;
        if (!el) return;
        el.style.setProperty('--gx', `${e.clientX}px`);
        el.style.setProperty('--gy', `${e.clientY}px`);
        el.style.setProperty('--gspot', '1');
      });
    };
    // Fade out when the pointer leaves the window.
    const out = (e: MouseEvent) => {
      if (!e.relatedTarget) spotRef.current?.style.setProperty('--gspot', '0');
    };
    window.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseout', out);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseout', out);
    };
  }, [spotlightOn, hidden]);

  if (hidden) return null;

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: LINES('var(--border)'),
        backgroundSize: GRID,
        opacity: 0.45,
        // gentle fade at the very edges of the screen
        maskImage: 'radial-gradient(ellipse 85% 90% at 50% 50%, black 55%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 90% at 50% 50%, black 55%, transparent 100%)',
      }} />
      {spotlightOn && (
        <div ref={spotRef} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(220px circle at var(--gx, -999px) var(--gy, -999px), var(--accent-glow), transparent 70%), ${LINES('var(--accent)')}`,
          backgroundSize: `100% 100%, ${GRID}, ${GRID}`,
          opacity: 'calc(var(--gspot, 0) * 0.55)',
          transition: 'opacity 0.45s ease',
          maskImage: 'radial-gradient(200px circle at var(--gx, -999px) var(--gy, -999px), black 0%, rgba(0,0,0,0.35) 45%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(200px circle at var(--gx, -999px) var(--gy, -999px), black 0%, rgba(0,0,0,0.35) 45%, transparent 100%)',
        }} />
      )}
    </div>
  );
}
