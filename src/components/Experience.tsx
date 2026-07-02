import { Briefcase, GraduationCap, TrendingUp, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const EXPERIENCE = [{
  company: 'AI LifeBOT', parent: 'Ignited Wings Technology Pvt. Ltd.', current: true,
  roles: [
    {
      title: 'AI Engineer - GenAI Solutions', badge: 'Promoted',
      period: 'Nov 2025 - Present', location: 'Raipur',
      projects: [
        {
          name: 'Franke Faber - Warehouse Automation',
          tools: ['Python', 'FastAPI', 'TypeScript', 'AI/ML Classification'],
          description: 'Led a team of 4 engineers, owning the entire project lifecycle from requirements through production deployment, to architect and ship a full warehouse automation platform from zero to production. Built an AI-driven defective-returns classification engine and intelligent workflow routing layer processing 2,000+ return units across an 8,000+ SKU catalogue.',
        },
        {
          name: 'Bajrang Ispat / Goel Pipes - NLP Quotation Engine',
          tools: ['NER', 'WhatsApp Business API'],
          description: "Architected a production NLP quotation system for a steel distributor managing 4,000+ SKUs. Designed an intent-classification and entity-extraction pipeline resolving free-form colloquial queries into structured price outputs at zero latency. Engineered WhatsApp Business API integration to serve real-time quotes natively on the customer's existing channel, and drove the system from POC through production hardening.",
        },
        {
          name: 'KISAAN KIOSK - Voice-First AI Smart-Farming',
          link: 'https://kisaan-kiosk.services.ailifebot.com',
          tools: ['Satellite Imagery', 'CNN', 'NLP'],
          description: 'Architected and engineered a 10+ language voice-first smart-farming platform featuring a custom-built live farmer avatar that autonomously navigates the full website via spoken interaction. Integrated ESA Copernicus satellite imagery for real-time NDVI-based crop health monitoring, a CNN-based crop disease classifier via image upload, and NLP-driven retrieval of live mandi prices and government schemes. Showcased to the Madhya Pradesh Government and the Gujarat Chief Minister.',
        },
        {
          name: 'CRIME INTEL',
          link: 'https://crimeintel-ai.services.ailifebot.com',
          tools: ['Speech-to-Text', 'Semantic Search'],
          description: 'Led solution delivery in direct collaboration with Telangana Police stakeholders, building the backend infrastructure, database layer, audio processing pipeline, and AI copilot for a law enforcement intelligence platform. Engineered speech-to-text ingestion, semantic FIR indexing, and an NL query interface for multi-district case retrieval and investigation assistance.',
        },
        {
          name: 'CGMSCL - RAG Enterprise Knowledge System',
          tools: ['AWS Lambda', 'RAG'],
          description: 'Deployed a RAG-based enterprise knowledge system for Chhattisgarh Medical Services Corporation Limited on AWS Lambda. Engineered serverless orchestration over large-scale structured and unstructured healthcare data, enabling sub-second natural-language query resolution across drug procurement and distribution records.',
        },
        {
          name: 'MIRA - Live Avatar AI Receptionist (NASCOM)',
          tools: ['DeepFace/FaceNet', 'WebSocket'],
          description: 'Engineered and deployed a real-time face recognition service supporting simultaneous detection of 18 faces against a 10,000-face database. Integrated directly with the live chatbot interface for automated visitor identification and personalized check-in.',
        },
        {
          name: 'OKAYA / Pure Chemicals / NSL - Conversational AI Backends',
          tools: [],
          description: 'Designed and shipped independent conversational AI backends for three production clients, engineering intent recognition, entity extraction, and API integration layers powering production-facing customer engagement systems.',
        },
      ],
      tags: ['GenAI', 'RAG', 'NLP', 'Computer Vision', 'AWS', 'FastAPI', 'WebSocket', 'Team Lead'],
    },
    {
      title: 'AI Engineer', badge: null,
      period: 'Oct 2024 - Oct 2025', location: 'Noida',
      bullets: [
        'Developed the backend for the Legal Assist Agent, an LLM-powered product built on a RAG pipeline over legal documents, handling intent routing and context-aware response generation for structured legal query resolution.',
        'Built the frontend for the AI Presenter, an interactive AI-powered presentation tool enabling users to generate and navigate slide decks through a conversational interface, developed in React with API integration to the backend generation layer.',
        'Contributed to the frontend of the AI SDR, an automated outbound sales outreach tool, building UI components for lead management, outreach sequencing, and response tracking dashboards.',
        'Assisted in developing the Request for Action Agent, a workflow automation agent that parses incoming requests, classifies action types, and routes them to downstream handlers via an orchestrated agent pipeline.',
        "Contributed to building a Chatbot Agent framework, a modular conversational agent supporting dynamic intent handling and context management, integrated with the AiLifeBot platform's omnichannel deployment layer.",
        'Built an AI SEO Automation Agent using Playwright and Puppeteer, expanding lead coverage by 35% over the Google Places API alone and automating large-scale multi-source scraping end to end.',
        'Developed client-specific data ingestion pipelines for EIE Instruments and built a lead automation agent, enabling scalable data collection, automated processing, and improved lead generation efficiency.',
        'Collaborated on an OCR-based Invoice Validator Agent, automating invoice parsing, entity extraction, and PO cross-validation, reducing manual verification effort by 60%.',
      ],
      tags: ['Python', 'React', 'RAG', 'LLM', 'Playwright', 'Puppeteer', 'OCR', 'Automation'],
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
          <p className="exp-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", maxWidth: '320px', textAlign: 'right' }}>
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
            <div className="exp-timeline" style={{ position: 'relative', paddingLeft: '28px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '44px' }}>
              {company.roles.map(role => (
                <div key={role.title} style={{ position: 'relative' }}>
                  <div className="exp-dot" style={{
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

                  {role.bullets && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                      {role.bullets.map(b => (
                        <li key={b} style={{ display: 'flex', gap: '10px', color: 'var(--text-muted)', fontSize: '0.91rem', lineHeight: 1.7 }}>
                          <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>›</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {role.projects && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '16px' }}>
                      {role.projects.map(p => (
                        <div key={p.name} style={{ paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.93rem', color: 'var(--text)' }}>
                              {p.name}
                            </h4>
                            {p.link && (
                              <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }} aria-label={`Open ${p.name}`}>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.68, marginBottom: p.tools.length ? '9px' : 0 }}>
                            {p.description}
                          </p>
                          {p.tools.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {p.tools.map(t => <span key={t} className="tag" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {role.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Education card */}
            <style>{`
              @media (max-width: 480px) {
                .exp-subtitle { text-align: left !important; }
                .exp-timeline { padding-left: 20px !important; }
                .exp-dot { left: -28px !important; }
              }
            `}</style>
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
                  B.Tech IT (IoT) · CGPA 8.94/10
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                  Google Cyber Security - 96.83% · Kaggle ML · 4+ Google Cloud Certifications
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
