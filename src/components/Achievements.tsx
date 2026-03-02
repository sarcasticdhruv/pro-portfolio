import { Cpu, FileText, Zap, Cloud, Shield, Trophy } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ACHIEVEMENTS = [
  {
    Icon: Cpu,
    title: 'IMC 2025 — Union Minister Demo',
    subtitle: 'India Mobile Congress 2025',
    date: '2025',
    description: 'Represented MITS Gwalior showcasing Kisaan Sahayak, Banking Automation, and Healthcare Assist Agent — earning recognition after live demo to Union Minister Jyotiraditya M. Scindia and industry leaders.',
    tags: ['AI', 'National Event', 'Recognition'],
    highlight: true,
  },
  {
    Icon: FileText,
    title: 'IEEE MPCON-2025 Research Paper',
    subtitle: 'IEEE International Conference, Jabalpur',
    date: '2025',
    description: '"Deep Learning-Based Classification of Brain Tumors in MRI Using CNNs and Transfer Learning" — accepted and presented at IEEE MPCON-2025.',
    tags: ['Research', 'IEEE', 'Deep Learning', 'Published'],
    highlight: true,
  },
  {
    Icon: Zap,
    title: 'Odoo Hackathon 2024',
    subtitle: 'Prototype in 6 hours',
    date: '2024',
    description: 'Shipped a functional Skill Swap platform prototype within a 6-hour hackathon window. Competed among national participants.',
    tags: ['Hackathon', 'Full-stack', '6hrs'],
    highlight: false,
  },
  {
    Icon: Cloud,
    title: '4× Google Cloud Certified',
    subtitle: 'Google Cloud Skill Boost',
    date: '2024',
    description: 'Cloud Compute, Cloud Vision API, GenAI with Gemini & Streamlit, Gen AI Study Jams (Batches 1 & 2). Active hands-on practitioner on GCP.',
    tags: ['Google', 'Cloud', 'Certified'],
    highlight: false,
  },
  {
    Icon: Shield,
    title: 'Google Cyber Security — 96.83%',
    subtitle: 'Professional Certificate',
    date: '2023–2024',
    description: "Completed Google's professional Cybersecurity certificate with a 96.83% grade. Covers network security, threat detection, SIEM, and incident response.",
    tags: ['Cybersecurity', 'Google', '96.83%'],
    highlight: false,
  },
  {
    Icon: Trophy,
    title: 'Department Rank 2',
    subtitle: 'MITS Gwalior · B.Tech IT (IoT)',
    date: '2022–Present',
    description: 'Consistently ranked 2nd in the IT department at MITS Gwalior with a CGPA of 8.94/10 across all semesters.',
    tags: ['Academic', 'Rank #2', 'CGPA 8.94'],
    highlight: false,
  },
];

export default function Achievements() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="achievements" ref={ref} className="section" style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.65s ease, transform 0.65s ease',
      background: 'var(--surface)',
    }}>
      <div className="container">
        <p className="label" style={{ marginBottom: '14px' }}>05 / achievements</p>
        <h2 className="section-heading" style={{ marginBottom: '44px' }}>
          Milestones &<br /><span style={{ color: 'var(--accent)' }}>recognition.</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(295px, 1fr))', gap: '18px' }}>
          {ACHIEVEMENTS.map(a => (
            <div key={a.title} style={{
              padding: '22px', background: 'var(--bg)',
              border: '1px solid', borderColor: a.highlight ? 'var(--accent-dim)' : 'var(--border)',
              borderRadius: '10px', position: 'relative', overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {a.highlight && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '11px' }}>
                <div style={{ width: '36px', height: '36px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <a.Icon size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>{a.date}</span>
              </div>

              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '3px' }}>
                {a.title}
              </h3>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--accent)', marginBottom: '10px' }}>
                {a.subtitle}
              </p>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '14px' }}>
                {a.description}
              </p>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {a.tags.map(t => <span key={t} className="tag" style={{ fontSize: '0.64rem' }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
