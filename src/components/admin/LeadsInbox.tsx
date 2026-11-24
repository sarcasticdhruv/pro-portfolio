// Admin "Inbox": everyone who tried to reach Dhruv through the chatbot
// (inline form, typed chat, live voice, email drafts), with whatever the
// server could learn about them: IP geolocation, network, device, and their
// visit history on the site.
import { useMemo, useState } from 'react';
import {
  Mail, Phone, MessageSquare, Mic, FileText, MapPin, Globe, Monitor, Clock,
  ChevronDown, ChevronRight, Archive, CheckCheck, Eye, Search, Building2,
} from 'lucide-react';
import { Pill } from '../charts/Charts';

export interface Lead {
  id: number;
  visitorId: string | null;
  source: 'form' | 'chat' | 'voice' | 'email-draft';
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  intent: string | null;
  message: string | null;
  transcript: string | null;
  status: 'new' | 'read' | 'replied' | 'archived';
  page: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  ip: string | null;
  location: {
    city: string | null; region: string | null; country: string | null; postal: string | null;
    lat: number | null; lon: number | null; timezone: string | null;
  };
  network: { isp: string | null; org: string | null; asn: string | null; isProxy: boolean | null; isHosting: boolean | null };
  visits: { count: number; firstSeen: string; lastSeen: string; pages: string[]; firstReferrer: string | null } | null;
}

const SOURCE_META: Record<Lead['source'], { label: string; Icon: typeof Mail }> = {
  form: { label: 'contact form', Icon: FileText },
  chat: { label: 'chat', Icon: MessageSquare },
  voice: { label: 'voice call', Icon: Mic },
  'email-draft': { label: 'email draft', Icon: Mail },
};

const mono = "'JetBrains Mono', monospace";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function device(ua: string | null): string {
  if (!ua) return 'unknown';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'other';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'other';
  return `${browser} on ${os}`;
}

function localTime(tz: string | null): string | null {
  if (!tz) return null;
  try {
    return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

function place(l: Lead['location']): string {
  return [l.city, l.region, l.country].filter(Boolean).join(', ') || 'unknown';
}

function Row({ Icon, label, children }: { Icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.76rem', lineHeight: 1.5 }}>
      <Icon size={13} style={{ color: 'var(--text-dim)', marginTop: '3px', flexShrink: 0 }} />
      <span style={{ color: 'var(--text-dim)', minWidth: '72px', fontFamily: mono, fontSize: '0.68rem', paddingTop: '1px' }}>{label}</span>
      <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

const linkStyle: React.CSSProperties = { color: 'var(--accent)', textDecoration: 'none' };

function LeadCard({ lead, onStatus }: { lead: Lead; onStatus: (id: number, status: Lead['status']) => void }) {
  const [open, setOpen] = useState(lead.status === 'new');
  const [showTranscript, setShowTranscript] = useState(false);
  const { label: srcLabel, Icon: SrcIcon } = SOURCE_META[lead.source] ?? SOURCE_META.chat;
  const tzTime = localTime(lead.location.timezone);
  const replySubject = encodeURIComponent('Re: your message on dhruv-choudhary.tech');
  const waDigits = lead.phone?.replace(/\D/g, '');

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${lead.status === 'new' ? 'var(--accent-dim)' : 'var(--border)'}`,
      borderRadius: '12px', overflow: 'hidden', boxShadow: lead.status === 'new' ? '0 0 0 1px var(--accent-glow)' : 'none',
    }}>
      <button
        onClick={() => {
          setOpen(o => !o);
          if (lead.status === 'new') onStatus(lead.id, 'read');
        }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {lead.status === 'new' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{lead.name || 'Unnamed visitor'}</span>
        {lead.company && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>· {lead.company}</span>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontFamily: mono, fontSize: '0.66rem' }}>
          <SrcIcon size={11} /> {srcLabel}
        </span>
        {lead.intent && <Pill label={lead.intent} tone="info" />}
        {!lead.email && !lead.phone && <Pill label="no contact yet" tone="warning" />}
        <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontFamily: mono, fontSize: '0.66rem', whiteSpace: 'nowrap' }}>
          {place(lead.location)} · {timeAgo(lead.updatedAt)}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px 38px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lead.message && (
            <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text)', borderLeft: '2px solid var(--accent-dim)', paddingLeft: '10px' }}>
              {lead.message}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '6px 24px' }}>
            {lead.email && <Row Icon={Mail} label="email"><a href={`mailto:${lead.email}?subject=${replySubject}`} style={linkStyle}>{lead.email}</a></Row>}
            {lead.phone && (
              <Row Icon={Phone} label="phone">
                <a href={`tel:${lead.phone}`} style={linkStyle}>{lead.phone}</a>
                {waDigits && waDigits.length >= 10 && <> · <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>WhatsApp</a></>}
              </Row>
            )}
            {lead.company && <Row Icon={Building2} label="company">{lead.company}</Row>}
            <Row Icon={MapPin} label="location">
              {place(lead.location)}{lead.location.postal ? ` ${lead.location.postal}` : ''}
              {lead.location.lat != null && lead.location.lon != null && (
                <> · <a href={`https://www.google.com/maps?q=${lead.location.lat},${lead.location.lon}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>map</a></>
              )}
            </Row>
            {tzTime && <Row Icon={Clock} label="their time">{tzTime} ({lead.location.timezone})</Row>}
            <Row Icon={Globe} label="network">
              {lead.network.isp || lead.network.org || 'unknown'}{lead.network.asn ? ` · ${lead.network.asn}` : ''}
              {lead.network.isProxy && <> <Pill label="vpn/proxy" tone="warning" /></>}
              {lead.network.isHosting && <> <Pill label="hosting" tone="info" /></>}
            </Row>
            <Row Icon={Monitor} label="device">{device(lead.userAgent)}{lead.ip ? ` · ${lead.ip}` : ''}</Row>
            {lead.visits && (
              <Row Icon={Eye} label="on site">
                {lead.visits.count} visit{lead.visits.count === 1 ? '' : 's'} since {new Date(lead.visits.firstSeen).toLocaleDateString()}
                {lead.visits.firstReferrer && <> · came from {lead.visits.firstReferrer.replace(/^https?:\/\//, '').slice(0, 40)}</>}
              </Row>
            )}
          </div>

          {lead.visits && lead.visits.pages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {lead.visits.pages.map(p => (
                <span key={p} style={{ fontFamily: mono, fontSize: '0.64rem', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{p}</span>
              ))}
            </div>
          )}

          {lead.transcript && (
            <div>
              <button
                onClick={() => setShowTranscript(v => !v)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-dim)', fontFamily: mono, fontSize: '0.68rem' }}
              >
                {showTranscript ? '▾ hide' : '▸ show'} conversation
              </button>
              {showTranscript && (
                <pre style={{
                  marginTop: '8px', maxHeight: '260px', overflow: 'auto', whiteSpace: 'pre-wrap',
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '10px 12px', fontSize: '0.72rem', lineHeight: 1.55, color: 'var(--text-muted)', fontFamily: mono,
                }}>{lead.transcript}</pre>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {lead.email && (
              <a href={`mailto:${lead.email}?subject=${replySubject}`} onClick={() => onStatus(lead.id, 'replied')} className="inbox-chip"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                <Mail size={11} /> reply
              </a>
            )}
            {lead.status !== 'replied' && (
              <button onClick={() => onStatus(lead.id, 'replied')} className="inbox-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCheck size={11} /> mark replied
              </button>
            )}
            {lead.status !== 'archived' ? (
              <button onClick={() => onStatus(lead.id, 'archived')} className="inbox-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Archive size={11} /> archive
              </button>
            ) : (
              <button onClick={() => onStatus(lead.id, 'read')} className="inbox-chip">unarchive</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Filter = 'open' | 'new' | 'replied' | 'archived' | 'all';

export default function LeadsInbox({
  leads, error, onStatus,
}: {
  leads: Lead[];
  error: string;
  onStatus: (id: number, status: Lead['status']) => void;
}) {
  const [filter, setFilter] = useState<Filter>('open');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter(l => {
      if (filter === 'open' && l.status === 'archived') return false;
      if (filter !== 'open' && filter !== 'all' && l.status !== filter) return false;
      if (!needle) return true;
      return [l.name, l.email, l.phone, l.company, l.message, l.location.city, l.location.country]
        .some(v => v?.toLowerCase().includes(needle));
    });
  }, [leads, filter, q]);

  const counts = {
    new: leads.filter(l => l.status === 'new').length,
    withContact: leads.filter(l => l.email || l.phone).length,
    voice: leads.filter(l => l.source === 'voice').length,
  };

  return (
    <div>
      <style>{`
        .inbox-chip {
          padding: 6px 12px; border-radius: 6px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-dim); font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem; cursor: pointer; transition: all 0.18s ease;
        }
        .inbox-chip:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '16px', fontFamily: mono, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
        <span><b style={{ color: 'var(--accent)' }}>{counts.new}</b> new</span>
        <span><b style={{ color: 'var(--text)' }}>{leads.length}</b> total</span>
        <span><b style={{ color: 'var(--text)' }}>{counts.withContact}</b> left contact details</span>
        <span><b style={{ color: 'var(--text)' }}>{counts.voice}</b> from voice calls</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        {(['open', 'new', 'replied', 'archived', 'all'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="inbox-chip"
            style={{ borderColor: filter === f ? 'var(--accent)' : undefined, color: filter === f ? 'var(--accent)' : undefined }}>
            {f}
          </button>
        ))}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
          border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', background: 'var(--surface)',
        }}>
          <Search size={12} style={{ color: 'var(--text-dim)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search name, email, city…"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: mono, fontSize: '0.72rem', width: '180px' }} />
        </div>
      </div>

      {error && <p style={{ color: '#FF6B6B', fontFamily: mono, fontSize: '0.78rem' }}>{error}</p>}

      {shown.length === 0 ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: mono, fontSize: '0.78rem',
          border: '1px dashed var(--border)', borderRadius: '12px',
        }}>
          {leads.length === 0 ? 'No one has reached out through the chatbot yet.' : 'Nothing matches this filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shown.map(l => <LeadCard key={l.id} lead={l} onStatus={onStatus} />)}
        </div>
      )}
    </div>
  );
}
