import { Linkedin, Github, Twitter } from 'lucide-react';

// Condensed from About.tsx's first paragraph - same facts (MITS Gwalior,
// AI LifeBOT, production AI systems), trimmed to a byline-length bio.
const BIO = "AI Engineer at AI LifeBOT, where I build GenAI systems that ship to production, not just notebooks and demos. Shipping RAG pipelines and agentic systems into real government and healthcare deployments.";

// Same URLs as Contact.tsx's LINKS - just the 3 most relevant here.
const LINKS = [
  { label: 'LinkedIn', href: 'https://linkedin.com/in/dhruv-choudhary-india', Icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/sarcasticdhruv', Icon: Github },
  { label: 'Twitter', href: 'https://twitter.com/SarcasticDhruv', Icon: Twitter },
];

export default function AuthorBio() {
  return (
    <div style={{
      display: 'flex', gap: '16px', alignItems: 'flex-start',
      padding: '22px', marginTop: '48px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px',
    }}>
      <img
        src="/profile.png"
        alt="Dhruv Choudhary"
        width={52}
        height={52}
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
          color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '6px',
          textTransform: 'uppercase',
        }}>
          written by
        </p>
        <p style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem',
          color: 'var(--text)', marginBottom: '8px',
        }}>
          Dhruv Choudhary <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>· AI Engineer</span>
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', lineHeight: 1.65,
          color: 'var(--text-muted)', marginBottom: '12px',
        }}>
          {BIO}
        </p>
        <div style={{ display: 'flex', gap: '14px' }}>
          {LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              style={{ color: 'var(--text-dim)', display: 'flex', transition: 'color 0.15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}
            >
              <link.Icon size={15} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
