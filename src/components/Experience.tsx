import { Briefcase, GraduationCap, TrendingUp, MapPin, Calendar } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const EXPERIENCE = [{
  company: 'AI LifeBOT', parent: 'Ignited Wings Technology Pvt. Ltd.', current: true,
  roles: [
    {
      title: 'AI Engineer — GenAI Solutions', badge: 'Promoted',
      period: 'Nov 2025 – Present', location: 'Raipur / Hyderabad',
      bullets: [
        'Led on-site client engagement for CHMSCL, delivering a GPT-based enterprise knowledge solution on AWS integrating large-scale structured and unstructured data.',
        'Designed, managed, and stabilized the AI-powered Grievance Management System for DPDMIS on OCI, ensuring production uptime for state government workflows.',
        'Contributed .NET-based development to EMIS (CHMSCL) live production system — bridging ML and backend engineering in real healthcare context.',
      ],
      tags: ['GenAI', 'AWS', 'OCI', 'GPT', 'Enterprise AI', '.NET', 'Healthcare AI'],
    },
    {
      title: 'AI Engineer Intern', badge: null,
      period: 'Oct 2024 – Oct 2025', location: 'Noida',
      bullets: [
        'Built an AI SEO Automation Agent using Playwright & Puppeteer, expanding lead coverage by 35% vs. Google Places API — automated large-scale multi-source scraping end-to-end.',
        'Developed client-specific data pipelines for EIE Instruments and a lead automation agent, enabling scalable automated data collection and processing.',
        'Collaborated on an OCR-based Invoice Validator Agent, automating entity extraction and cross-checking; reduced manual verification effort by 60%.',
        'Architected a no-code chatbot builder platform with modular design, omnichannel integration, and real-time analytics.',
      ],
      tags: ['Python', 'Playwright', 'Puppeteer', 'OCR', 'Automation', 'Node.js', 'MongoDB'],
    },
  ],
}];

export default function Experience() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="experience" ref={ref} className="section" style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.65s ease, transform 0.65s ease',
    }}>
      <div className="container">
        <p className="label" style={{ marginBottom: '14px' }}>02 / experience</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '14px' }}>
          <h2 className="section-heading">Where I've<br /><span style={{ color: 'var(--accent)' }}>shipped.</span></h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", maxWidth: '320px', textAlign: 'right' }}>
            Production AI systems. Real users. Real stakes.
          </p>
        </div>

        {EXPERIENCE.map(company => (
          <div key={company.company}>
            {/* Company header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', paddingBottom: '18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: '42px', height: '42px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Briefcase size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
                    {company.company}
                  </span>
                  {company.current && (
                    <span style={{ padding: '2px 8px', background: 'var(--accent-glow)', border: '1px solid var(--tag-border)', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: 'var(--accent)', letterSpacing: '0.06em' }}>
                      CURRENT
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.71rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {company.parent}
                </p>
              </div>
            </div>

            {/* Roles */}
            <div style={{ position: 'relative', paddingLeft: '28px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '44px' }}>
              {company.roles.map(role => (
                <div key={role.title} style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '-36px', top: '5px',
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: role.badge ? 'var(--accent)' : 'var(--border-2)',
                    border: '2px solid var(--bg)',
                    boxShadow: role.badge ? '0 0 10px var(--accent)' : 'none',
                  }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '1.02rem', color: 'var(--text)' }}>
                          {role.title}
                        </h3>
                        {role.badge && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--accent-glow-strong)', border: '1px solid var(--accent-dim)', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: 'var(--accent)', letterSpacing: '0.06em' }}>
                            <TrendingUp size={9} /> {role.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.71rem', color: 'var(--text-dim)' }}>
                          <MapPin size={10} /> {role.location}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.71rem', color: 'var(--text-dim)' }}>
                          <Calendar size={10} /> {role.period}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {role.bullets.map(b => (
                      <li key={b} style={{ display: 'flex', gap: '10px', color: 'var(--text-muted)', fontSize: '0.91rem', lineHeight: 1.7 }}>
                        <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>›</span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {role.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Education card */}
            <div style={{ marginTop: '44px', padding: '22px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', gap: '18px', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.97rem', color: 'var(--text)' }}>
                    Madhav Institute of Technology and Science
                  </span>
                  <span style={{ padding: '2px 8px', background: 'var(--accent-glow)', border: '1px solid var(--tag-border)', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: 'var(--accent)' }}>
                    Dept Rank #2
                  </span>
                </div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '5px' }}>
                  B.Tech IT (IoT) · CGPA 8.94/10 · Oct 2022 – May 2026 · Gwalior
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                  Google Cyber Security — 96.83% · Kaggle ML · 4+ Google Cloud Certifications
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
