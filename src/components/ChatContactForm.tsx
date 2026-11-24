// Inline contact form the chatbot shows when a visitor wants to reach Dhruv.
// Prefilled from the conversation; submitting saves a lead (admin Inbox).
import { useState, type FormEvent } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { saveLead, type LeadDetails } from '../lib/leads';
import { trackEvent } from '../lib/track';

interface Props {
  initial?: LeadDetails;
  getTranscript: () => string;
  onSubmitted?: (details: LeadDetails) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '7px 10px', color: 'var(--text)', outline: 'none',
  fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', boxSizing: 'border-box',
};

export default function ChatContactForm({ initial, getTranscript, onSubmitted }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [message, setMessage] = useState(initial?.message ?? '');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [problem, setProblem] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending' || state === 'sent') return;
    const em = email.trim();
    const ph = phone.trim();
    if (!name.trim()) return setProblem('Add your name so I know who to reply to.');
    if (!em && !ph) return setProblem('Add an email or a phone number.');
    if (em && !EMAIL_RE.test(em)) return setProblem('That email looks off.');
    if (ph && ph.replace(/\D/g, '').length < 7) return setProblem('That phone number looks too short.');
    setProblem('');
    setState('sending');
    const details: LeadDetails = { name: name.trim(), email: em || undefined, phone: ph || undefined, message: message.trim() || undefined };
    const ok = await saveLead('form', { ...details, ...(website ? { website } as object : {}) }, getTranscript());
    if (ok) {
      setState('sent');
      trackEvent('contact_form_submit', em || ph);
      onSubmitted?.(details);
    } else {
      setState('error');
      setProblem('Could not send right now. Email me at nrdhruv654@gmail.com instead.');
    }
  }

  if (state === 'sent') {
    return (
      <div style={{
        maxWidth: '85%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 13px', borderRadius: '12px', border: '1px solid var(--accent-dim)',
        background: 'var(--accent-glow)', color: 'var(--text)', fontSize: '0.8rem',
      }}>
        <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span>Sent. I'll get back to you at {email.trim() || phone.trim()}.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{
        width: '85%', display: 'flex', flexDirection: 'column', gap: '7px',
        padding: '11px', borderRadius: '12px', border: '1px solid var(--border)',
        background: 'var(--surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      }}
    >
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
        reach me directly
      </span>
      <input aria-label="Your name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={fieldStyle} autoComplete="name" />
      <div style={{ display: 'flex', gap: '6px' }}>
        <input aria-label="Email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} autoComplete="email" />
        <input aria-label="Phone (optional)" type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} autoComplete="tel" />
      </div>
      <textarea
        aria-label="Message"
        placeholder="What would you like to talk about?"
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.45 }}
      />
      {/* honeypot: hidden from people, bots fill it */}
      <input
        tabIndex={-1} aria-hidden="true" autoComplete="off" value={website}
        onChange={e => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
      />
      {problem && <span style={{ color: '#FF6B6B', fontSize: '0.72rem' }}>{problem}</span>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>Only used to reply to you.</span>
        <button
          type="submit"
          disabled={state === 'sending'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--accent)', color: 'var(--chat-user-text)', border: 'none',
            borderRadius: '8px', padding: '7px 13px', cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 600,
          }}
        >
          {state === 'sending' ? <Loader2 size={12} className="spin-slow" /> : <Send size={12} />}
          {state === 'sending' ? 'sending' : 'send'}
        </button>
      </div>
    </form>
  );
}
