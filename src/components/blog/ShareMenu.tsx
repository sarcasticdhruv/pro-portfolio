import { useEffect, useRef, useState } from 'react';
import { Share2, Twitter, Linkedin, MessageCircle, Link2, Check } from 'lucide-react';

interface Props {
  title: string;
  url: string;
}

function RedditIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="9" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M8.5 15.5c1 .8 2.2 1.2 3.5 1.2s2.5-.4 3.5-1.2" strokeLinecap="round" />
      <path d="M12 8.5V5.5l2.2.5" />
      <circle cx="15" cy="5.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ShareMenu({ title, url }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: 'X / Twitter',
      icon: <Twitter size={13} />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&via=SarcasticDhruv`,
    },
    {
      label: 'LinkedIn',
      icon: <Linkedin size={13} />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={13} />,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: 'Reddit',
      icon: <RedditIcon size={13} />,
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
  ];

  function handleCopy() {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'color 0.15s, background 0.15s',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Share this post"
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          color: open ? 'var(--text)' : 'var(--text-dim)',
          background: 'none',
          padding: '6px 12px',
          border: '1px solid',
          borderColor: open ? 'var(--border-2)' : 'var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }
        }}
      >
        <Share2 size={12} />
        share
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          right: 0,
          minWidth: '180px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          zIndex: 20,
          animation: 'shareMenuIn 0.14s ease both',
        }}>
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={itemStyle}
              onClick={() => setOpen(false)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                (e.currentTarget as HTMLElement).style.background = 'var(--tag-bg)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)';
                (e.currentTarget as HTMLElement).style.background = 'none';
              }}
            >
              {link.icon}
              {link.label}
            </a>
          ))}

          <div style={{ height: '1px', background: 'var(--border)', margin: '5px 4px' }} />

          <button
            onClick={handleCopy}
            style={itemStyle}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text)';
              (e.currentTarget as HTMLElement).style.background = 'var(--tag-bg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)';
              (e.currentTarget as HTMLElement).style.background = 'none';
            }}
          >
            {copied ? <Check size={13} /> : <Link2 size={13} />}
            {copied ? 'copied!' : 'copy link'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes shareMenuIn {
          from { opacity: 0; transform: translateY(4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
