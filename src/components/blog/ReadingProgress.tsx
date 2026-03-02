import { useEffect, useRef, useState } from 'react';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    articleRef.current = document.querySelector('article');

    const update = () => {
      const el = articleRef.current;
      if (!el) {
        // fallback: full-page scroll
        const doc = document.documentElement;
        const scrolled = doc.scrollTop;
        const total = doc.scrollHeight - doc.clientHeight;
        setProgress(total > 0 ? (scrolled / total) * 100 : 0);
        return;
      }
      const rect = el.getBoundingClientRect();
      const articleH = el.offsetHeight;
      const scrolled = -rect.top;
      const pct = Math.min(100, Math.max(0, (scrolled / (articleH - window.innerHeight)) * 100));
      setProgress(pct);
    };

    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '2px', zIndex: 500, pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'var(--accent)',
        boxShadow: '0 0 8px var(--accent)',
        transition: 'width 0.08s linear',
      }} />
    </div>
  );
}
