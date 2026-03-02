import { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TARGET_URL = 'https://developer-dhruv.netlify.app/neoport';

// Render a single boot line with styling
function BootLine({ text }: { text: string }) {
  const trimmed = text.trim();

  // Blank / whitespace
  if (!trimmed) return <div style={{ height: '0.7em' }} />;

  // [OK] lines
  if (trimmed.startsWith('[  ') && trimmed.includes('OK')) {
    return (
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', lineHeight: 1.5 }}>
        <span style={{ color: '#4A6A52' }}>[  </span>
        <span style={{ color: '#28C840', fontWeight: 700 }}>  OK  </span>
        <span style={{ color: '#4A6A52' }}>  ]</span>
        <span style={{ color: '#7A9E82' }}>{text.replace(/\[\s*OK\s*\]/, '').trim().replace(/^[-–]\s*/, ' ')}</span>
      </div>
    );
  }

  // OSBoot markers
  if (trimmed.startsWith('[OSBoot')) {
    const n = trimmed.replace('[OSBoot', '').replace(']', '');
    return (
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', lineHeight: 1.5, color: '#2A5A3A' }}>
        <span style={{ color: '#00D96D', fontWeight: 700 }}>[ boot </span>
        <span style={{ color: '#00D96D' }}>{n.padStart(2, '0')} </span>
        <span style={{ color: '#00D96D', fontWeight: 700 }}>]</span>
        <span style={{ color: '#4A7A5A' }}> kernel module loaded</span>
      </div>
    );
  }

  // Boot Complete
  if (trimmed === 'Boot Complete') {
    return (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.88rem',
        color: '#00D96D',
        fontWeight: 700,
        letterSpacing: '0.08em',
        marginTop: '8px',
      }}>
        ✓  Boot Complete — launching neoport...
      </div>
    );
  }

  // Error / warning heuristics
  const isErr = /error|fail|panic/i.test(trimmed);
  const isWarn = /warn|timeout/i.test(trimmed);

  // Key: value pattern
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx > 0 && colonIdx < 26 && !trimmed.startsWith('http') && !trimmed.startsWith('//') && /^[A-Za-z]/.test(trimmed)) {
    const key = trimmed.slice(0, colonIdx);
    const val = trimmed.slice(colonIdx + 1);
    return (
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', lineHeight: 1.5 }}>
        <span style={{ color: isErr ? '#FF6B6B' : '#1E90FF' }}>{key}</span>
        <span style={{ color: '#2A5A3A' }}>:</span>
        <span style={{ color: isErr ? '#FF9F9F' : isWarn ? '#FEBC2E' : '#8AB8A0' }}>{val}</span>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.74rem',
      lineHeight: 1.5,
      color: isErr ? '#FF6B6B' : isWarn ? '#FEBC2E' : '#5A8A6A',
    }}>{text}</div>
  );
}

export default function BootRedirect({ onClose }: Props) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [fading, setFading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    let lineIndex = 0;
    let allLines: string[] = [];

    async function loadAndStream() {
      try {
        const res = await fetch('/data.txt');
        const text = await res.text();
        allLines = text.split('\n');
      } catch {
        allLines = ['Error loading boot sequence...', 'Boot Complete'];
      }

      function scheduleNext() {
        if (cancelled) return;
        if (lineIndex >= allLines.length) {
          // Done streaming — wait, then redirect
          timerRef.current = setTimeout(() => {
            if (cancelled) return;
            setDone(true);
            timerRef.current = setTimeout(() => {
              if (cancelled) return;
              window.open(TARGET_URL, '_blank');
              setFading(true);
              timerRef.current = setTimeout(() => {
                if (!cancelled) onClose();
              }, 650);
            }, 900);
          }, 200);
          return;
        }

        const line = allLines[lineIndex++];
        setVisibleLines(prev => [...prev, line]);

        // Auto-scroll
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        });

        // Timing: blank lines faster, normal lines 17ms, vary slightly for realism
        const isBlank = line.trim() === '';
        const delay = isBlank ? 8 : 14 + Math.random() * 8;
        timerRef.current = setTimeout(scheduleNext, delay);
      }

      scheduleNext();
    }

    loadAndStream();

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: '#07110A',
        display: 'flex',
        flexDirection: 'column',
        opacity: fading ? 0 : 1,
        transition: fading ? 'opacity 0.6s ease' : 'none',
      }}
    >
      {/* Top bar */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #1C3024',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '7px' }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <div key={i} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c, opacity: 0.8 }} />
          ))}
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: '#4A6A52',
          letterSpacing: '0.06em',
        }}>Linux 6.9.3-arch1-1 — boot sequence</span>
        <button
          onClick={() => {
            setFading(true);
            setTimeout(onClose, 600);
          }}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid #1C3024',
            borderRadius: '6px',
            color: '#4A6A52',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            padding: '3px 9px',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00D96D'; (e.currentTarget as HTMLElement).style.borderColor = '#00D96D'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A6A52'; (e.currentTarget as HTMLElement).style.borderColor = '#1C3024'; }}
        >
          esc
        </button>
      </div>

      {/* Boot output */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 24px 24px',
          scrollbarWidth: 'none',
        }}
      >
        {/* Kernel banner */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          color: '#2A5A3A',
          marginBottom: '10px',
          lineHeight: 1.5,
          borderBottom: '1px solid #1C3024',
          paddingBottom: '10px',
        }}>
          <span style={{ color: '#00D96D' }}>dhruv</span>
          <span style={{ color: '#4A6A52' }}>@arch ~ </span>
          <span style={{ color: '#7A9E82' }}>starting boot sequence</span>
          <span style={{ display: 'inline-block', width: '2px', height: '0.9em', background: '#00D96D', marginLeft: '3px', verticalAlign: 'middle', animation: 'bootCursor 0.9s step-end infinite' }} />
        </div>

        {visibleLines.map((line, i) => (
          <BootLine key={i} text={line} />
        ))}

        {done && (
          <div style={{ marginTop: '12px' }}>
            <BootLine text="Boot Complete" />
          </div>
        )}

        {/* Blinking cursor at end */}
        {!done && (
          <span style={{
            display: 'inline-block',
            width: '7px',
            height: '13px',
            background: '#00D96D',
            verticalAlign: 'sub',
            marginLeft: '2px',
            animation: 'bootCursor 0.7s step-end infinite',
          }} />
        )}
      </div>

      <style>{`
        @keyframes bootCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
