// Contact section form. Submissions land in the admin Inbox (/api/leads),
// merged with anything the same visitor told the chatbot, and trigger an
// email notification when RESEND_API_KEY is configured on the server.
import { useState, type FormEvent } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { saveLead } from '../lib/leads';
import { trackEvent } from '../lib/track';

const TOPICS = [
  { value: 'hire', label: 'Full-time role' },
  { value: 'freelance', label: 'Freelance project' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'other', label: 'Just saying hi' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const mono = "'JetBrains Mono', monospace";

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px',
  color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', outline: 'none',
  transition: 'border-color 0.18s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: mono, fontSize: '0.64rem', color: 'var(--text-dim)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px',
};

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('hire');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [problem, setProblem] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    const em = email.trim();
    const ph = phone.trim();
    if (!name.trim()) return setProblem('Add your name.');
    if (!em && !ph) return setProblem('Add an email or phone number so I can reply.');
    if (em && !EMAIL_RE.test(em)) return setProblem('That email looks off.');
    if (ph && ph.replace(/\D/g, '').length < 7) return setProblem('That phone number looks too short.');
    if (message.trim().length < 5) return setProblem('Add a line about what you have in mind.');
    setProblem('');
    setState('sending');
    const ok = await saveLead('form', {
      name: name.trim(),
      email: em || undefined,
      phone: ph || undefined,
      company: company.trim() || undefined,
      intent: topic,
      message: message.trim(),
      ...(website ? ({ website } as object) : {}),
    }, `Contact form (${TOPICS.find(t => t.value === topic)?.label}):\n${message.trim()}`);
    if (ok) {
      setState('sent');
      trackEvent('contact_form_submit', `${topic} ${em || ph}`);
    } else {
      setState('error');
      setProblem('Could not send right now. Email me at nrdhruv654@gmail.com instead.');
    }
  }

  if (state === 'sent') {
    return (
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '18px 20px',
        background: 'var(--accent-glow)', border: '1px solid var(--accent-dim)', borderRadius: '10px',
      }}>
        <Check size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Got it, {name.trim().split(' ')[0]}.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            I'll get back to you at {email.trim() || phone.trim()}, usually within a day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', flex: 1 }}>
      <div className="cf-row">
        <div>
          <label style={labelStyle} htmlFor="cf-name">name</label>
          <input id="cf-name" style={field} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="cf-company">company <span style={{ opacity: 0.6 }}>(optional)</span></label>
          <input id="cf-company" style={field} value={company} onChange={e => setCompany(e.target.value)} autoComplete="organization" placeholder="Where you work" />
        </div>
      </div>
      <div className="cf-row">
        <div>
          <label style={labelStyle} htmlFor="cf-email">email</label>
          <input id="cf-email" type="email" style={field} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="cf-phone">phone <span style={{ opacity: 0.6 }}>(optional)</span></label>
          <input id="cf-phone" type="tel" style={field} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="+91 ..." />
        </div>
      </div>
      <div>
        <span style={labelStyle}>what's it about</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {TOPICS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTopic(t.value)}
              aria-pressed={topic === t.value}
              style={{
                padding: '6px 12px', borderRadius: '100px', cursor: 'pointer',
                fontFamily: mono, fontSize: '0.7rem',
                border: `1px solid ${topic === t.value ? 'var(--accent)' : 'var(--border)'}`,
                background: topic === t.value ? 'var(--accent-glow)' : 'transparent',
                color: topic === t.value ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Grows to fill the card when the side column is taller */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <label style={labelStyle} htmlFor="cf-message">message</label>
        <textarea
          id="cf-message" rows={4} style={{ ...field, resize: 'vertical', lineHeight: 1.55, flex: 1, minHeight: '110px' }}
          value={message} onChange={e => setMessage(e.target.value)}
          placeholder="The role, the project, or the problem you're working on"
        />
      </div>
      <input
        tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
      />
      {problem && <p style={{ color: '#FF6B6B', fontSize: '0.8rem', margin: 0 }}>{problem}</p>}
      <div className="cf-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Goes straight to me. Only used to reply.</span>
        <button type="submit" className="btn btn-primary" disabled={state === 'sending'} style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
          {state === 'sending' ? <Loader2 size={13} className="cf-spin" /> : <Send size={13} />}
          {state === 'sending' ? 'sending' : 'send message'}
        </button>
      </div>
      <style>{`
        .cf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 520px) {
          .cf-row { grid-template-columns: 1fr; }
          .cf-actions { flex-direction: column-reverse; align-items: stretch !important; }
          .cf-actions .btn { justify-content: center; }
        }
        #contact input:focus, #contact textarea:focus { border-color: var(--accent) !important; }
        @keyframes cf-spin-kf { to { transform: rotate(360deg); } }
        .cf-spin { animation: cf-spin-kf 1s linear infinite; }
      `}</style>
    </form>
  );
}
