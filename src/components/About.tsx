import { Zap, BookOpen, Cloud, Code2, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function About() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="about" ref={ref} className="section" style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.65s ease, transform 0.65s ease',
    }}>
      <div className="container">
        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'start' }}>
          <div>
            <p className="label" style={{ marginBottom: '14px' }}>01 / about</p>
            <h2 className="section-heading" style={{ marginBottom: '26px' }}>
              I build things<br />
              <span style={{ color: 'var(--accent)' }}>that make sense.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.8 }}>
              Final-year B.Tech student at MITS Gwalior, Department Rank 2 in Information Technology.
              I work at the intersection of AI systems and practical engineering - not just notebooks
              and demos, but pipelines that handle real client data at scale.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.8 }}>
              Currently an <span style={{ color: 'var(--text)' }}>AI Engineer at AI LifeBOT</span> (Ignited Wings Technology),
              where I've shipped GPT-based enterprise solutions on AWS, built grievance management AI for
              state government systems, and contributed to live production systems handling real healthcare workflows.
            </p>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
              My research on <span style={{ color: 'var(--text)' }}>Deep Learning-based Brain Tumor Classification</span> was
              accepted at IEEE MPCON-2025. Demonstrated AI innovations to Union Minister Jyotiraditya M. Scindia
              at IMC 2025. I write Python like I breathe, argue about system design for fun.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ padding: '22px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', borderLeft: '3px solid var(--accent)', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                $ currently
              </p>
              {[
                { icon: <Zap size={13} />, text: 'Enterprise GenAI on AWS @ AI LifeBOT' },
                { icon: <Code2 size={13} />, text: 'LLM finetuning & RAG architectures' },
                { icon: <Cloud size={13} />, text: 'Cloud Architecture & System Design' },
                { icon: <BookOpen size={13} />, text: 'Sharpening DSA in C++ for interviews' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: '10px', marginBottom: '10px', color: 'var(--text-muted)', fontSize: '0.91rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>

            <div style={{ padding: '22px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                quick.facts
              </p>
              {[
                ['Degree', 'B.Tech IT (IoT) · MITS Gwalior'],
                ['CGPA', '8.94 / 10'],
                ['Location', 'Bhopal → Raipur / Hyderabad'],
                ['Role', 'AI Engineer @ Ignited Wings'],
                ['Paper', 'IEEE MPCON-2025'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '9px', fontSize: '0.87rem', gap: '14px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-dim)', flexShrink: 0, fontSize: '0.76rem' }}>{k}</span>
                  <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'GitHub', href: 'https://github.com/sarcasticdhruv' },
                { label: 'LinkedIn', href: 'https://linkedin.com/in/dhruv-choudhary-india' },
                { label: 'Twitter', href: 'https://twitter.com/SarcasticDhruv' },
                { label: 'Linktree', href: 'https://linktr.ee/Dhruv.Choudhary' },
              ].map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline"
                  style={{ fontSize: '0.73rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {label} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) { .about-grid { grid-template-columns: 1fr !important; gap: 36px !important; } }
      `}</style>
    </section>
  );
}
