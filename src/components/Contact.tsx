import { useState } from 'react';
import { Mail, Github, Linkedin, Twitter, Link, ArrowUpRight, Copy, Check } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const LINKS = [
  { label: 'Email', value: 'nrdhruv654@gmail.com', href: 'mailto:nrdhruv654@gmail.com', Icon: Mail },
  { label: 'LinkedIn', value: 'dhruv-choudhary-india', href: 'https://linkedin.com/in/dhruv-choudhary-india', Icon: Linkedin },
  { label: 'GitHub', value: 'sarcasticdhruv', href: 'https://github.com/sarcasticdhruv', Icon: Github },
  { label: 'Twitter', value: '@SarcasticDhruv', href: 'https://twitter.com/SarcasticDhruv', Icon: Twitter },
  { label: 'Linktree', value: 'Dhruv.Choudhary', href: 'https://linktr.ee/Dhruv.Choudhary', Icon: Link },
];

export default function Contact() {
  const { ref, visible } = useScrollReveal();
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('nrdhruv654@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contact" ref={ref} className="section" style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.65s ease, transform 0.65s ease',
    }}>
      <div className="container">
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'start' }}>
          <div>
            <p className="label" style={{ marginBottom: '14px' }}>06 / contact</p>
            <h2 className="section-heading" style={{ marginBottom: '22px' }}>
              Let's build<br /><span style={{ color: 'var(--accent)' }}>something.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.8 }}>
              Open to AI/ML engineering roles, research collaborations, and interesting problems.
              Graduating May 2026 — actively looking for full-time opportunities.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.8, fontSize: '0.91rem' }}>
              Currently between Raipur and Hyderabad. Will relocate. Will debug your production
              incident at 2am if the problem is interesting enough.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a href="mailto:nrdhruv654@gmail.com" className="btn btn-primary">
                <Mail size={13} /> say hello
              </a>
              <button onClick={copyEmail} className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'copied!' : 'copy email'}
              </button>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {LINKS.map(link => <ContactRow key={link.label} link={link} />)}
            </div>

            <div style={{ marginTop: '28px', padding: '18px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px' }}>
                status
              </p>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Available for <span style={{ color: 'var(--text)' }}>full-time AI/ML/SWE roles</span> from
                May 2026. Open to internships, research, and collaborations now.
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr !important; gap: 36px !important; } }
      `}</style>
    </section>
  );
}

function ContactRow({ link }: { link: typeof LINKS[number] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a href={link.href} target={link.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 14px', background: hovered ? 'var(--surface)' : 'transparent',
        borderRadius: '6px', textDecoration: 'none', transition: 'background 0.18s ease', gap: '14px',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <link.Icon size={14} style={{ color: hovered ? 'var(--accent)' : 'var(--text-dim)', transition: 'color 0.18s' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {link.label}
        </span>
      </div>
      <span style={{ fontSize: '0.87rem', color: hovered ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.18s', flex: 1, textAlign: 'right' }}>
        {link.value}
      </span>
      <ArrowUpRight size={12} style={{ color: hovered ? 'var(--accent)' : 'var(--text-dim)', transition: 'color 0.18s', flexShrink: 0 }} />
    </a>
  );
}
