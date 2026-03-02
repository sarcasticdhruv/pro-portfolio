import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

// ── Groq config (reuse same key + model as Terminal) ─────────────────────────
const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are Dhruv Choudhary's personal AI assistant embedded in his portfolio website. Be concise, friendly, and personable - like Dhruv himself. Answer questions about him accurately using the info below. If asked something you don't know, say so honestly.

=== IDENTITY ===
Name: Dhruv Choudhary
Handle: @sarcasticdhruv
Email: nrdhruv654@gmail.com
GitHub: github.com/sarcasticdhruv
LinkedIn: linkedin.com/in/dhruv-choudhary-india
Twitter: @SarcasticDhruv
Linktree: linktr.ee/Dhruv.Choudhary
Location: Bhopal / Raipur / Hyderabad

=== EDUCATION ===
B.Tech IT (IoT) - MITS Gwalior
CGPA: 8.94 | Dept Rank #2 | Graduating May 2026

=== CURRENT ROLE ===
AI Engineer (GenAI Solutions) @ AI LifeBOT - Ignited Wings Technology Pvt. Ltd.
Nov 2025 - Present
- Built GPT-based enterprise knowledge base on AWS for CHMSCL
- AI Grievance Management System for DPDMIS on OCI
- .NET contributions to EMIS live production system

=== INTERNSHIP ===
AI Engineer Intern @ AI LifeBOT - Oct 2024 - Oct 2025
- SEO Automation Agent: +35% lead coverage
- OCR Invoice Validator: -60% manual effort
- No-code omnichannel chatbot builder platform

=== PROJECTS ===
1. AI Kisaan Sahayak - Multilingual agri AI assistant for farmers (voice + LLM + RAG)
2. Brain Tumor Detection - Deep learning classification, IEEE MPCON-2025 published paper
3. BoardBrief - AI board meeting summariser with action-item extraction
4. Fire Notes - Smart note-taking app with AI tagging and search
5. IPL Analysis - Data visualization dashboard for IPL stats
6. Vaccine Management System - Full-stack healthcare records platform

=== SKILLS ===
Languages: Python, C/C++, TypeScript, JavaScript, SQL
AI/ML: PyTorch, TensorFlow, OpenCV, Langgraph, YOLO, LLM Finetuning, RAG, Agentic AI
Backend: REST APIs, MongoDB, Redis, PostgreSQL, Microservices
Cloud: AWS, GCP, OCI, Docker, Kubernetes, CI/CD, GitHub Actions
Frontend: React JS, React Native
Tools: Playwright, Puppeteer, Postman, Retool

=== ACHIEVEMENTS ===
- IEEE MPCON-2025: Published paper on Brain Tumor Classification
- IMC 2025: Live demo to Union Minister Jyotiraditya Scindia
- Odoo Hackathon: Functional prototype in 6 hours
- Google Cyber Security certification: 96.83%
- Kaggle Machine Learning certification
- Multiple Google Cloud certifications (GenAI, Vision API, Gemini)

=== CERTIFICATIONS ===
Google Cloud Compute Basics - Aug 2024
Analyze Images (Cloud Vision API) - Sep 2024
Develop GenAI Apps (Gemini) - Oct 2024
Gen AI Study Jams (Batch 1 & 2) - 2024
Google Cyber Security - 96.83% | 2023-2024
Kaggle Machine Learning - 2024

=== PERSONALITY ===
Python purist, systems thinker, occasional C++ masochist, cloud architecture enthusiast. Believes in building AI that ships to production, not just demos. Enjoys problem-solving at the intersection of AI and real-world impact.
`;

async function groqChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const key = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (!key) throw new Error('VITE_GROQ_API_KEY not set in .env');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 500,
      temperature: 0.72,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `AI error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response.';
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  id: number;
}

let msgId = 0;

const SUGGESTIONS = [
  "What's Dhruv working on?",
  'Tell me about his AI projects',
  'What skills does he have?',
  'How can I contact him?',
];

// rotating subtitle lines for header
const SUBTITLES = [
  'powered by coffe and 73% water.',
  'Powered by neurons and nonsense.',
  'Powered by organized chaos.',
  'Powered by questions.',
  'Powered by late-night deployments.',
  'Powered by curiosity & clean commits.',
  'Powered by thoughts at 2AM.',
  'Powered by human energy.',
  'Powered by relentless debugging.',
];

// ── Component ────────────────────────────────────────────────────────────────
export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasOpened, setHasOpened] = useState(false);

  const [subtitleIdx, setSubtitleIdx] = useState(0);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // cycle subtitle every 5 seconds
  useEffect(() => {
    const handle = setInterval(() => {
      setSubtitleIdx(i => (i + 1) % SUBTITLES.length);
    }, 5000);
    return () => clearInterval(handle);
  }, []);


  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      if (!hasOpened) {
        setHasOpened(true);
        // Greeting message
        setMessages([{
          id: msgId++,
          role: 'assistant',
          content: "Hey! I'm Dhruv's AI. Ask me anything about his work, projects, skills, or how to reach him. 👋",
        }]);
      }
    }
  }, [open]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setError('');

    const userMsg: Msg = { id: msgId++, role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const reply = await groqChat(history);
      setMessages(prev => [...prev, { id: msgId++, role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* ── Panel ── */}
      <div
        aria-hidden={!open}
        style={{
          position: 'fixed',
          bottom: open ? '88px' : '72px',
          right: '24px',
          width: 'clamp(320px, 90vw, 384px)',
          height: open ? 'min(540px, 80vh)' : '0px',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          zIndex: 4000,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          border: open ? '1px solid var(--border-2)' : 'none',
          background: 'var(--surface)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px var(--border)',
          transition: 'bottom 0.32s cubic-bezier(.22,1,.36,1), height 0.32s cubic-bezier(.22,1,.36,1), opacity 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/profile.png"
              alt="Dhruv"
              width={34}
              height={34}
              style={{ borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover', display: 'block' }}
            />
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '9px', height: '9px',
              background: 'var(--accent)',
              border: '2px solid var(--surface-2)',
              borderRadius: '50%',
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '0.88rem',
              color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}>Ask Dhruv's AI</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.65rem',
              color: 'var(--accent)',
              letterSpacing: '0.04em',
            }}>{SUBTITLES[subtitleIdx]}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', padding: '4px', lineHeight: 0,
              borderRadius: '6px', transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--scrollbar-thumb) transparent',
          }}
        >
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: 'var(--text-dim)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
            }}>
              <Sparkles size={28} style={{ color: 'var(--accent)', margin: '0 auto 10px', display: 'block', opacity: 0.6 }} />
              Ask anything about Dhruv
            </div>
          )}

          {messages.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '9px 13px',
                borderRadius: m.role === 'user'
                  ? '14px 14px 4px 14px'
                  : '14px 14px 14px 4px',
                background: m.role === 'user'
                  ? 'var(--accent)'
                  : 'var(--surface-2)',
                color: m.role === 'user' ? 'var(--chat-user-text)' : 'var(--text)',
                fontSize: '0.84rem',
                lineHeight: 1.6,
                fontFamily: "'DM Sans', sans-serif",
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                boxShadow: m.role === 'user'
                  ? '0 2px 8px rgba(0,217,109,0.2)'
                  : '0 1px 4px rgba(0,0,0,0.2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '5px',
                alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'inline-block',
                    animation: `chatDot 1.1s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.25)',
              color: '#FF6B6B',
              fontSize: '0.75rem',
              fontFamily: "'JetBrains Mono', monospace",
            }}>{error}</div>
          )}
        </div>

        {/* Suggestions - only show if no messages sent by user yet */},{}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div style={{
            padding: '8px 12px 4px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                  borderRadius: '100px',
                  padding: '4px 10px',
                  fontSize: '0.69rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'var(--accent-glow-strong)';
                  el.style.color = 'var(--accent)';
                  el.style.borderColor = 'var(--accent-dim)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'var(--tag-bg)';
                  el.style.color = 'var(--text-muted)';
                  el.style.borderColor = 'var(--tag-border)';
                }}
              >{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 12px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about Dhruv…"
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '9px 13px',
              color: 'var(--text)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.84rem',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent-dim)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="Send"
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '10px',
              width: '38px',
              height: '38px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.45 : 1,
              transition: 'opacity 0.15s, transform 0.1s',
              flexShrink: 0,
              color: '#07110A',
            }}
            onMouseEnter={e => { if (!loading && input.trim()) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* ── FAB Toggle Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: open ? 'var(--surface-2)' : 'var(--bg)',
          cursor: 'pointer',
          zIndex: 4001,
          padding: 0,
          overflow: 'hidden',
          boxShadow: open
            ? '0 4px 20px rgba(0,217,109,0.3), 0 0 0 4px var(--accent-glow)'
            : '0 4px 16px rgba(0,0,0,0.4), 0 0 0 2px var(--border)',
          transition: 'box-shadow 0.25s ease, border-color 0.25s, transform 0.18s cubic-bezier(.22,1,.36,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      >
        {open ? (
          <X size={22} color="var(--accent)" />
        ) : (
          <img
            src="/profile.png"
            alt="Chat with Dhruv's AI"
            width={52}
            height={52}
            style={{ objectFit: 'cover', borderRadius: '50%', display: 'block' }}
          />
        )}
      </button>

      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
