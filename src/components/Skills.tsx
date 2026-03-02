import { Code2, Brain, Server, Cloud, Layout, Award } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const SKILL_GROUPS = [
  {
    category: 'Languages', code: 'lang', Icon: Code2,
    skills: [
      { name: 'Python', level: 95 }, { name: 'C/C++', level: 82 },
      { name: 'TypeScript', level: 80 }, { name: 'JavaScript', level: 82 }, { name: 'SQL', level: 75 },
    ],
  },
  {
    category: 'AI / ML', code: 'ai', Icon: Brain,
    skills: [
      { name: 'PyTorch', level: 85 }, { name: 'TensorFlow', level: 83 },
      { name: 'OpenCV', level: 80 }, { name: 'Langgraph', level: 78 }, { name: 'LLM Finetuning', level: 72 },
    ],
  },
  {
    category: 'Backend & Infra', code: 'backend', Icon: Server,
    skills: [
      { name: 'REST APIs', level: 88 }, { name: 'MongoDB', level: 80 },
      { name: 'Redis', level: 70 }, { name: 'PostgreSQL', level: 72 }, { name: 'Microservices', level: 73 },
    ],
  },
  {
    category: 'Cloud & DevOps', code: 'cloud', Icon: Cloud,
    skills: [
      { name: 'AWS', level: 80 }, { name: 'GCP', level: 78 },
      { name: 'Docker', level: 82 }, { name: 'Kubernetes', level: 68 }, { name: 'CI/CD', level: 75 },
    ],
  },
  {
    category: 'Frontend', code: 'fe', Icon: Layout,
    skills: [
      { name: 'React JS', level: 84 }, { name: 'React Native', level: 70 },
      { name: 'TypeScript', level: 80 }, { name: 'Vite', level: 78 },
    ],
  },
  {
    category: 'Certifications', code: 'cert', Icon: Award,
    skills: [
      { name: 'Google Cloud Compute', level: null }, { name: 'Cloud Vision API', level: null },
      { name: 'GenAI with Gemini', level: null }, { name: 'Google Cyber Security', level: null },
      { name: 'Kaggle ML', level: null },
    ],
  },
];

export default function Skills() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="skills" ref={ref} className="section" style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.65s ease, transform 0.65s ease',
    }}>
      <div className="container">
        <p className="label" style={{ marginBottom: '14px' }}>04 / skills</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '14px' }}>
          <h2 className="section-heading">The stack I<br /><span style={{ color: 'var(--accent)' }}>work with.</span></h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", maxWidth: '280px', textAlign: 'right' }}>
            Bars reflect hands-on proficiency.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {SKILL_GROUPS.map((group, gi) => (
            <div key={group.code} style={{ padding: '22px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <group.Icon size={13} style={{ color: 'var(--accent)' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {group.code}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '0.83rem', color: 'var(--text)' }}>
                  {group.category}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {group.skills.map(skill => (
                  <div key={skill.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>{skill.name}</span>
                      {skill.level !== null && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                          {skill.level}%
                        </span>
                      )}
                    </div>
                    {skill.level !== null ? (
                      <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${visible ? skill.level : 0}%`,
                          background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
                          borderRadius: '2px',
                          transition: `width 1.1s ease ${gi * 55}ms`,
                        }} />
                      </div>
                    ) : (
                      <div style={{ height: '3px', background: 'var(--accent-glow)', borderRadius: '2px', border: '1px solid var(--tag-border)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '32px', padding: '22px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
            also worked with
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {['Playwright', 'Puppeteer', 'Selenium', 'BeautifulSoup', 'OCR', 'RAG', 'LangChain', 'Retool', 'Postman', 'DenseNet-121', 'YOLO', 'Attention Mechanisms', 'GitHub Actions', 'OCI', 'Firebase', 'Express.js'].map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
