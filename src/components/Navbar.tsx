import { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Theme } from '../types';

interface Props { theme: Theme; onToggleTheme: () => void; }

const NAV_LINKS = [
  { label: 'about', href: '/#about' },
  { label: 'experience', href: '/#experience' },
  { label: 'projects', href: '/#projects' },
  { label: 'skills', href: '/#skills' },
  { label: 'contact', href: '/#contact' },
];

export default function Navbar({ theme, onToggleTheme }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const onBlog = pathname.startsWith('/blog');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'var(--bg)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
      }}>
        <a href="/" style={{
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
          fontSize: '0.92rem', color: 'var(--accent)', letterSpacing: '0.02em',
        }}>
          <span style={{ color: 'var(--text-dim)' }}>~/</span>dhruv
        </a>

        {/* Desktop */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href} style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem',
              color: 'var(--text-muted)', letterSpacing: '0.04em',
              transition: 'color 0.18s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              {link.label}
            </a>
          ))}

          {/* Blog link */}
          <Link
            to="/blog"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.76rem',
              letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: '5px',
              textDecoration: 'none',
              color: onBlog ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = onBlog ? 'var(--accent)' : 'var(--text-muted)')}
          >
            <BookOpen size={13} />
            blog
          </Link>

          <ThemeBtn theme={theme} onToggle={onToggleTheme} />
        </div>

        {/* Mobile */}
        <div className="nav-mobile" style={{ display: 'none', alignItems: 'center', gap: '12px' }}>
          <ThemeBtn theme={theme} onToggle={onToggleTheme} />
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text)', padding: '4px', display: 'flex',
          }}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99,
          background: 'var(--bg)', borderBottom: '1px solid var(--border)',
          padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: '18px',
        }}>
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.83rem', color: 'var(--text-muted)',
            }}>
              ./{link.label}
            </a>
          ))}
          <Link
            to="/blog"
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.83rem',
              color: onBlog ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <BookOpen size={13} />
            ./blog
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
        @media (max-width: 480px) {
          nav { padding: 0 16px !important; }
        }
      `}</style>
    </>
  );
}

function ThemeBtn({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '6px', width: '34px', height: '34px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', transition: 'all 0.18s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
      }}>
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
