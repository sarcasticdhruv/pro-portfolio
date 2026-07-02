import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { X, Send, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Groq config ───────────────────────────────────────────────────────────────
const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are Dhruv Choudhary, replying personally through the chat box on your own portfolio site. You are not an "assistant" talking about Dhruv in the third person. You ARE Dhruv. Always speak in the first person ("I", "my", "me").

=== HOW I WRITE (MATCH THIS VOICE) ===
- Plain, direct, measured. Confident without hype. I write like an engineer who has actually shipped systems to production.
- Mostly short, declarative sentences. I'll drop a one-line sentence on its own for emphasis.
- I never use em-dashes (the "—" character). They read as AI-written. For asides I use commas, parentheses, or just a separate short sentence.
- I avoid emojis, exclamation marks, hashtags, and filler enthusiasm.
- I'm concrete. I'd rather give a specific detail (a number, a tradeoff, a real example) than a vague adjective.
- No marketing speak. Never say things like "passionate about leveraging synergies" or "results-driven professional". Talk like a real person who knows the craft.
- Keep replies tight: usually 2-5 sentences. Expand only when the question genuinely needs depth.
- If I don't know something, I say so plainly. I never invent facts about myself, my projects, or my numbers.
- I'm friendly and approachable, just not loud about it. Dry, occasional understated humor is fine; clowning is not.

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
Nov 2025 - Present, Raipur (Promoted)
- Franke Faber: led a team of 4, built a warehouse automation platform with an AI defective-returns classifier processing 2,000+ units across 8,000+ SKUs
- Bajrang Ispat / Goel Pipes: NLP quotation engine with NER + WhatsApp Business API for a steel distributor's 4,000+ SKUs
- KISAAN KIOSK: 10+ language voice-first farming platform with a live AI avatar, satellite crop monitoring, CNN disease detection - shown to the Madhya Pradesh Government and Gujarat CM
- CRIME INTEL: law enforcement intelligence platform for Telangana Police - speech-to-text, semantic FIR search, NL case retrieval
- CGMSCL: RAG enterprise knowledge system on AWS Lambda for Chhattisgarh Medical Services Corporation Limited
- MIRA: real-time face recognition AI receptionist, 18 simultaneous faces against a 10,000-face database (NASCOM)
- Conversational AI backends for OKAYA, Pure Chemicals, and NSL

=== PRIOR ROLE ===
AI Engineer @ AI LifeBOT - Oct 2024 - Oct 2025, Noida
- Legal Assist Agent backend: RAG pipeline over legal documents
- AI Presenter frontend: conversational slide deck generation, built in React
- AI SDR frontend: outbound sales outreach UI
- Request for Action Agent: workflow automation and routing
- Chatbot Agent framework: modular omnichannel conversational agent
- AI SEO Automation Agent: +35% lead coverage using Playwright/Puppeteer
- EIE Instruments data pipelines + lead automation agent
- OCR Invoice Validator Agent: -60% manual verification effort

=== PROJECTS ===
1. Helix Framework - Production-grade AI agent framework on PyPI (pip install helix-framework). Like CrewAI/LangGraph but with the production layer built in: hard budget limits, semantic caching (cuts API costs 40-70%), persistent memory, multi-agent teams, YAML pipelines, 5-scorer eval suite. Supports OpenAI, Anthropic, Gemini, Groq, Mistral + more. GitHub: github.com/sarcasticdhruv/helix-agent
2. AI Kisaan Sahayak - Multilingual agri AI assistant for farmers (voice + LLM + RAG)
3. Brain Tumor Detection - Deep learning classification, IEEE MPCON-2025 published paper
4. BoardBrief - AI board meeting summariser with action-item extraction
5. Fire Notes - Smart note-taking app with AI tagging and search
6. IPL Analysis - Data visualization dashboard for IPL stats
7. Vaccine Management System - Full-stack healthcare records platform

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

=== HOW I THINK ===
I care about AI that ships to production, not AI that demos well. In most of the systems I've built, the model was the easy part. The real work is the engineering around it: reliability, edge cases, honest uncertainty, behavior when the LLM API is down or a query falls outside the distribution. I work mostly at the point where AI meets real users and real infrastructure, where a system has to actually hold up. I'm a Python-first engineer, comfortable in C/C++ and TypeScript, and I think a lot about system design and where things break.

=== NAVIGATION ACTIONS ===
You can guide the user to different parts of the portfolio by appending action tags at the very end of your reply. Only do this when it genuinely helps the user get somewhere they want to go.

Format: [ACTION|type|target|label]
- type is either "navigate" (internal page) or "open" (external URL)
- target is the path or URL
- label is what the button says (3-5 words max)

Available internal routes:
  /blog           → Blog posts
  /games          → Games page
  /#projects      → Projects section on homepage
  /#experience    → Experience section on homepage
  /#skills        → Skills section on homepage
  /#contact       → Contact section on homepage
  /#about         → About section on homepage

External links:
  https://github.com/sarcasticdhruv           → my GitHub
  https://linkedin.com/in/dhruv-choudhary-india → my LinkedIn
  mailto:nrdhruv654@gmail.com                  → email me

Examples:
  User: "show me your blog" → reply ending with [ACTION|navigate|/blog|Read the blog]
  User: "I want to play games" → reply ending with [ACTION|navigate|/games|Open games]
  User: "show me your projects" → reply ending with [ACTION|navigate|/#projects|See projects]
  User: "how do I contact you?" → reply ending with [ACTION|open|mailto:nrdhruv654@gmail.com|Email me][ACTION|open|https://linkedin.com/in/dhruv-choudhary-india|LinkedIn]
  User: "what skills do you have?" → reply ending with [ACTION|navigate|/#skills|View skills]
  User: "where do you work?" → reply ending with [ACTION|navigate|/#experience|See experience]
  User: "show me github" → reply ending with [ACTION|open|https://github.com/sarcasticdhruv|GitHub profile]

You can include up to 2 actions. Do not include actions for general knowledge questions that don't need navigation. Never put action tags anywhere except the very end of your reply.
`;

// ── Action parsing ────────────────────────────────────────────────────────────
interface Action {
  type: 'navigate' | 'open';
  target: string;
  label: string;
}

function parseActions(text: string): { clean: string; actions: Action[] } {
  const actions: Action[] = [];
  const clean = text
    .replace(/\[ACTION\|(\w+)\|([^|]+)\|([^\]]+)\]/g, (_, type, target, label) => {
      if (type === 'navigate' || type === 'open') {
        actions.push({ type, target: target.trim(), label: label.trim() });
      }
      return '';
    })
    .trim();
  return { clean, actions };
}

// ── Groq fetch ────────────────────────────────────────────────────────────────
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
  actions?: Action[];
  id: number;
}

let msgId = 0;

const SUGGESTIONS = [
  "What's Dhruv working on?",
  'Tell me about his AI projects',
  'What skills does he have?',
  'How can I contact him?',
];

const TEASERS = [
  'Ask me anything',
  "What's Dhruv building?",
  'Curious about my projects?',
  'Ask about my AI work',
  'Want the short version?',
  'How do I reach you?',
  'Ask about my stack',
  'What am I working on?',
  'Got a question? Ask away',
  'Ask about my IEEE paper',
];

const SUBTITLES = [
  'AI engineer, answering as me',
  'ask about my work or projects',
  'GenAI, shipped to production',
  'trained on how I actually write',
  'reliability over demos',
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasOpened, setHasOpened] = useState(false);
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [teaserIdx, setTeaserIdx] = useState(0);
  const [teaserVisible, setTeaserVisible] = useState(true);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
    inputRef.current?.focus();
  }, [messages, loading]);

  useEffect(() => {
    const handle = setInterval(() => {
      setSubtitleIdx(i => (i + 1) % SUBTITLES.length);
    }, 5000);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    if (open) return;
    const handle = setInterval(() => {
      setTeaserVisible(false);
      setTimeout(() => {
        setTeaserIdx(i => (i + 1) % TEASERS.length);
        setTeaserVisible(true);
      }, 260);
    }, 3500);
    return () => clearInterval(handle);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      if (!hasOpened) {
        setHasOpened(true);
        setMessages([{
          id: msgId++,
          role: 'assistant',
          content: "Hey it's Dhruv. Well, an AI that answers the way I would. Ask me about my work, my projects, the stack I use, or how to reach me.",
        }]);
      }
    }
  }, [open]);

  function handleAction(action: Action) {
    if (action.type === 'navigate') {
      if (action.target.startsWith('/#')) {
        // Hash navigation: go to home then scroll
        setOpen(false);
        setTimeout(() => {
          if (window.location.pathname === '/') {
            const id = action.target.slice(2);
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.location.href = action.target;
          }
        }, 200);
      } else {
        setOpen(false);
        setTimeout(() => navigate(action.target), 200);
      }
    } else {
      window.open(action.target, '_blank', 'noopener,noreferrer');
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 0);

    const userMsg: Msg = { id: msgId++, role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const raw = await groqChat(history);
      const { clean, actions } = parseActions(raw);
      setMessages(prev => [...prev, {
        id: msgId++,
        role: 'assistant',
        content: clean,
        actions: actions.length ? actions : undefined,
      }]);
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
          bottom: open ? '104px' : '72px',
          right: 'clamp(12px, 4vw, 24px)',
          width: 'clamp(286px, 92vw, 384px)',
          height: open ? 'min(560px, 82vh)' : '0px',
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
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/profile.png" alt="Dhruv"
              width={34} height={34}
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
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: '0.88rem', color: 'var(--text)', letterSpacing: '-0.01em',
            }}>Ask Dhruv</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.04em',
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
            flex: 1, overflowY: 'auto',
            padding: '16px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--scrollbar-thumb) transparent',
          }}
        >
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 16px',
              color: 'var(--text-dim)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
            }}>
              <Sparkles size={28} style={{ color: 'var(--accent)', margin: '0 auto 10px', display: 'block', opacity: 0.6 }} />
              Ask anything about Dhruv
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
              <div style={{
                maxWidth: '85%',
                padding: '9px 13px',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                color: m.role === 'user' ? 'var(--chat-user-text)' : 'var(--text)',
                fontSize: '0.84rem', lineHeight: 1.6,
                fontFamily: "'DM Sans', sans-serif",
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                boxShadow: m.role === 'user'
                  ? '0 2px 8px rgba(0,217,109,0.2)'
                  : '0 1px 4px rgba(0,0,0,0.2)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {m.content}
              </div>

              {/* Action buttons */}
              {m.actions && m.actions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '85%' }}>
                  {m.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(action)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid var(--accent-dim)',
                        background: 'var(--accent-glow)',
                        color: 'var(--accent)',
                        fontSize: '0.75rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500,
                        cursor: 'pointer',
                        letterSpacing: '0.01em',
                        transition: 'background 0.15s, border-color 0.15s, transform 0.12s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'var(--accent-glow-strong)';
                        el.style.borderColor = 'var(--accent)';
                        el.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'var(--accent-glow)';
                        el.style.borderColor = 'var(--accent-dim)';
                        el.style.transform = 'translateY(0)';
                      }}
                    >
                      {action.type === 'open'
                        ? <ExternalLink size={11} />
                        : <ArrowRight size={11} />}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex', gap: '5px', alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'inline-block',
                    animation: `chatDot 1.1s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: '8px',
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.25)',
              color: '#FF6B6B', fontSize: '0.75rem',
              fontFamily: "'JetBrains Mono', monospace",
            }}>{error}</div>
          )}
        </div>

        {/* Suggestions */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div style={{
            padding: '8px 12px 4px',
            display: 'flex', flexWrap: 'wrap', gap: '6px',
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
          display: 'flex', gap: '8px',
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
              fontSize: '16px',
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
              background: 'var(--accent)', border: 'none', borderRadius: '10px',
              width: '38px', height: '38px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.45 : 1,
              transition: 'opacity 0.15s, transform 0.1s',
              flexShrink: 0, color: '#07110A',
            }}
            onMouseEnter={e => { if (!loading && input.trim()) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* ── Teaser bubble ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI chat"
          className="chat-teaser"
          style={{
            position: 'fixed', bottom: '94px',
            right: 'clamp(12px, 4vw, 24px)',
            zIndex: 4001,
            maxWidth: 'min(220px, 60vw)',
            padding: '9px 14px',
            borderRadius: '14px 14px 4px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border-2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.28), 0 0 0 1px var(--border)',
            color: 'var(--text)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.35,
            cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap',
            opacity: teaserVisible ? 1 : 0,
            transform: teaserVisible ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.26s ease, transform 0.26s ease',
          }}
        >
          {TEASERS[teaserIdx]}
          <span style={{
            position: 'absolute', bottom: '-6px', right: '20px',
            width: '12px', height: '12px',
            background: 'var(--surface)',
            borderRight: '1px solid var(--border-2)',
            borderBottom: '1px solid var(--border-2)',
            transform: 'rotate(45deg)',
          }} />
        </button>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        style={{
          position: 'fixed', bottom: '24px',
          right: 'clamp(12px, 4vw, 24px)',
          width: '68px', height: '68px',
          borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: open ? 'var(--surface-2)' : 'var(--bg)',
          cursor: 'pointer', zIndex: 4001,
          padding: 0, overflow: 'hidden',
          boxShadow: open
            ? '0 4px 20px rgba(0,217,109,0.3), 0 0 0 4px var(--accent-glow)'
            : '0 6px 20px rgba(0,0,0,0.4), 0 0 0 2px var(--border)',
          transition: 'box-shadow 0.25s ease, border-color 0.25s, transform 0.18s cubic-bezier(.22,1,.36,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      >
        {open ? (
          <X size={24} color="var(--accent)" />
        ) : (
          <img
            src="/profile.png" alt="Chat with Dhruv's AI"
            width={64} height={64}
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
