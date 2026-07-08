import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

const SHOW_AFTER_PX = 420;

// Two related scroll behaviors, both needed on every page:
//
// 1. React Router doesn't reset scroll on navigation - if you're scrolled to
//    the bottom of the homepage (e.g. the contact section) and click through
//    to /blog, the new page renders already scrolled to that same offset
//    ("opens from the bottom") instead of at the top like a normal page load.
// 2. A floating back-to-top button, the same pattern most content sites use,
//    so a reader who scrolled deep into a long page (a blog post, this
//    site's single-page sections) doesn't have to manually scroll all the
//    way back up.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const [visible, setVisible] = useState(false);

  // Reset to top on route change - but not on a same-page hash jump
  // (/#about, /#contact), which should keep its native anchor-scroll.
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return (
    <>
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top"
        className="scroll-to-top-btn"
        style={{
          position: 'fixed',
          // Left, not right - the AI chatbot launcher already lives at
          // bottom-right (see AIChatbot.tsx), so this stays out of its way
          // regardless of whether the chat panel is open or closed.
          left: '24px',
          bottom: '24px',
          zIndex: 60,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 0.2s ease, transform 0.2s ease, border-color 0.18s ease, color 0.18s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
        }}
      >
        <ArrowUp size={18} />
      </button>
      <style>{`
        @media (max-width: 480px) {
          .scroll-to-top-btn { left: 16px !important; bottom: 16px !important; width: 40px !important; height: 40px !important; }
        }
      `}</style>
    </>
  );
}
