import { useState, useEffect } from 'react';
import { Github, Linkedin, Mail, MapPin, ArrowRight, Circle } from 'lucide-react';
import Terminal from './Terminal';
import BootRedirect from './BootRedirect';
import type { GitHubStats } from '../types';

interface Props { github: GitHubStats; }

const TITLES = [
  'AI Engineer',
  'GenAI Solutions Builder',
  'ML Systems Developer',
  'Open Source Contributor',
];

export default function Hero({ github }: Props) {
  const [titleIndex, setTitleIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [showBoot, setShowBoot] = useState(false);

  useEffect(() => {
    const target = TITLES[titleIndex];
    if (typing) {
      if (charIndex < target.length) {
        const t = setTimeout(() => {
          setDisplayed(target.slice(0, charIndex + 1));
          setCharIndex(c => c + 1);
        }, 62);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 2100);
        return () => clearTimeout(t);
      }
    } else {
      if (charIndex > 0) {
        const t = setTimeout(() => {
          setDisplayed(target.slice(0, charIndex - 1));
          setCharIndex(c => c - 1);
        }, 33);
        return () => clearTimeout(t);
      } else {
        setTitleIndex(i => (i + 1) % TITLES.length);
        setTyping(true);
      }
    }
  }, [charIndex, typing, titleIndex]);

  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '88px 32px 40px',
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        opacity: 0.3,
        maskImage: 'radial-gradient(ellipse 80% 80% at 30% 50%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 30% 50%, black 30%, transparent 100%)',
      }} />

      {/* TOP: Status badge + Name + Typewriter — full width */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '28px' }}>
        {/* Status */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '5px 14px',
          background: 'var(--accent-glow)', border: '1px solid var(--tag-border)',
          borderRadius: '100px', marginBottom: '22px',
        }}>
          <Circle size={7} style={{ fill: 'var(--accent)', color: 'var(--accent)' }} className="pulse-dot" />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.71rem', color: 'var(--accent)', letterSpacing: '0.06em' }}>
            available for opportunities
          </span>
        </div>

        {/* Name — click triggers neoport Easter egg */}
        <h1
          onClick={() => setShowPopup(true)}
          title="Click me 👀"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 800, lineHeight: 1.02,
            letterSpacing: '-0.03em',
            color: 'var(--text)', marginBottom: '14px',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.82'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          Dhruv<br />
          <span style={{ color: 'var(--accent)' }}>Choudhary</span>
        </h1>

        {/* Typewriter */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: '2px',
        }}>
          <span style={{ color: 'var(--text-dim)' }}>$ role=</span>
          <span style={{ color: 'var(--text)' }}>{displayed}</span>
          <span style={{ display: 'inline-block', width: '2px', height: '1.1em', background: 'var(--accent)', marginLeft: '1px', verticalAlign: 'middle' }} className="cursor-blink" />
        </div>
      </div>

      {/* MAIN ROW: Left bio content + Right terminal side-by-side */}
      <div className="hero-main-row" style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>

        {/* Left: bio, location, CTAs, stats */}
        <div style={{ flex: '0 0 auto', maxWidth: '440px', width: '100%' }}>
          {/* Bio */}
          <p style={{ fontSize: '0.97rem', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.78 }}>
            B.Tech IT @ MITS Gwalior, Dept Rank 2 (CGPA 8.94).
            Building production AI systems at AI LifeBOT. IEEE-published researcher.
            Python purist, systems thinker, occasional C++ masochist.
          </p>

          {/* Location */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '24px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem', color: 'var(--text-dim)',
          }}>
            <MapPin size={12} />
            Bhopal / Raipur / Hyderabad
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '36px' }}>
            <a href="#projects" className="btn btn-primary">
              <ArrowRight size={14} /> view projects
            </a>
            <a href="https://github.com/sarcasticdhruv" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              <Github size={14} /> GitHub
            </a>
            <a href="https://linkedin.com/in/dhruv-choudhary-india" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              <Linkedin size={14} />
            </a>
            <a href="mailto:nrdhruv654@gmail.com" className="btn btn-outline">
              <Mail size={14} />
            </a>
          </div>

          {/* Stats
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'repos', value: github.loading ? '—' : String(github.profile?.public_repos ?? 0) },
              { label: 'stars', value: github.loading ? '—' : String(github.totalStars) },
              { label: 'followers', value: github.loading ? '—' : String(github.profile?.followers ?? 0) },
              { label: 'dept rank', value: '#2' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '14px 12px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '8px', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontSize: '1.55rem', fontWeight: 700,
                  color: label === 'dept rank' ? 'var(--accent)' : 'var(--text)',
                }}>{value}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
                  color: 'var(--text-dim)', marginTop: '2px',
                  textTransform: 'uppercase', letterSpacing: '0.09em',
                }}>{label}</div>
              </div>
            ))}
          </div>*/}
        </div> 

        {/* Right: Terminal — aligned with bio paragraph */}
        {showTerminal && (
          <div className="hero-terminal-wrap" style={{
            flex: 1,
            minWidth: 0,
            height: 'clamp(380px, calc(100vh - 320px), 580px)',
            maxHeight: 'calc(100vh - 140px)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px var(--border)',
          }}>
            <Terminal github={github} onClose={() => setShowTerminal(false)} />
          </div>
        )}

        {/* Re-open terminal button */}
        {!showTerminal && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', paddingTop: '4px' }}>
            <button
              onClick={() => setShowTerminal(true)}
              className="btn btn-outline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              open terminal
            </button>
          </div>
        )}
      </div>

      {/* Scroll cue */}
      <div style={{
        position: 'absolute', bottom: '24px', left: '32px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{ width: '1px', height: '44px', background: 'linear-gradient(to bottom, transparent, var(--accent))' }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.64rem',
          letterSpacing: '0.12em', writingMode: 'vertical-rl',
          color: 'var(--text-dim)',
        }}>SCROLL</span>
      </div>

      {/* ── Portfolio Popup ─────────────────────────────────── */}
      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 8000,
            background: 'rgba(7,17,10,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'popupFadeIn 0.18s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: '16px',
              padding: '28px 32px 24px',
              maxWidth: '380px',
              width: 'calc(100vw - 48px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px var(--border)',
              animation: 'popupSlideUp 0.22s cubic-bezier(.22,1,.36,1)',
            }}
          >
            {/* Terminal prompt line */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              marginBottom: '14px',
              letterSpacing: '0.04em',
            }}>
              <span style={{ color: 'var(--accent)' }}>dhruv</span>
              <span style={{ color: 'var(--text-dim)' }}>@arch</span>
              <span style={{ color: 'var(--text-dim)' }}> ~ $ </span>
              <span style={{ color: 'var(--text-muted)' }}>open --new-portfolio</span>
            </div>

            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '1rem',
              color: 'var(--text)',
              lineHeight: 1.6,
              marginBottom: '6px',
              fontWeight: 500,
            }}>
              Want to open my other portfolio?
            </p>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              marginBottom: '22px',
              letterSpacing: '0.02em',
            }}>
              develope-dhruv.netlify.app/neoport
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setShowBoot(true);
                }}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '10px 0',
                  color: '#07110A',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                yes, boot it
              </button>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid var(--border-2)',
                  borderRadius: '9px',
                  padding: '10px 0',
                  color: 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.78rem',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-dim)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; }}
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Boot Animation ─────────────────────────────────── */}
      {showBoot && (
        <BootRedirect onClose={() => setShowBoot(false)} />
      )}

      <style>{`
        .pulse-dot { animation: pulseGlow 2s ease-in-out infinite; }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px var(--accent)); }
          50% { opacity: 0.5; filter: drop-shadow(0 0 2px var(--accent)); }
        }
        @keyframes popupFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes popupSlideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .hero-terminal-wrap { height: clamp(340px, calc(100vh - 360px), 520px) !important; }
        }
        @media (max-width: 820px) {
          .hero-main-row { flex-direction: column !important; gap: 32px !important; }
          .hero-main-row > div:first-child { max-width: 100% !important; }
          .hero-terminal-wrap {
            width: 100% !important;
            height: clamp(320px, 50vw, 420px) !important;
            max-height: 420px !important;
          }
        }
        @media (max-width: 540px) {
          #hero { padding-left: 18px !important; padding-right: 18px !important; }
          .hero-terminal-wrap { height: 300px !important; }
        }
      `}</style>
    </section>
  );
}
