// Shared chart primitives for /watched and /admin.
//
// Every chart here is SINGLE-SERIES magnitude, which is why there is no
// categorical palette and no legend: one accent fill against a recessive
// track, with the value direct-labelled. A legend would add a colour key for
// colours that don't encode anything, and a tooltip would hide a number a
// label can just show. Built as plain divs rather than SVG so they inherit the
// site's theme tokens and reflow responsively for free.

interface BarProps {
  label: string;
  count: number;
  max: number;
  labelWidth?: string;
  suffix?: string;
}

export function Bar({ label, count, max, labelWidth = '92px', suffix }: BarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span title={label} style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem',
        color: 'var(--text-dim)', width: labelWidth, flexShrink: 0,
        textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '9px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: max > 0 ? `${Math.max(count > 0 ? 3 : 0, (count / max) * 100)}%` : '0%',
          height: '100%', background: 'var(--accent)', borderRadius: '4px',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem',
        color: 'var(--text-muted)', minWidth: '24px', flexShrink: 0,
      }}>
        {count}{suffix ?? ''}
      </span>
    </div>
  );
}

// Vertical column chart - the right form for a dense time series where the
// x-axis is ordered and the label per column would not fit horizontally.
export function Columns({ data, height = 90 }: { data: [string, number][]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d[1]));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height }}>
      {data.map(([label, v]) => (
        <div key={label} title={`${label}: ${v}`} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 0,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem',
            color: 'var(--text-dim)', marginBottom: '3px',
          }}>
            {v > 0 ? v : ''}
          </span>
          <div style={{
            width: '100%',
            height: `${(v / max) * 100}%`,
            minHeight: v > 0 ? '3px' : '1px',
            background: v > 0 ? 'var(--accent)' : 'var(--surface-2)',
            borderRadius: '3px 3px 0 0',
            transition: 'height 0.4s ease',
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem',
            color: 'var(--text-dim)', marginTop: '4px',
            whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%',
          }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, note, children, wide }: {
  title: string; note?: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '16px 18px',
      gridColumn: wide ? '1 / -1' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '14px' }}>
        <p className="label" style={{ fontSize: '0.64rem' }}>{title}</p>
        {note && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: 'var(--text-dim)' }}>
            {note}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>{children}</div>
    </div>
  );
}

// A headline number is the right form when there is exactly one value to read;
// wrapping it in a chart would add ink without adding information.
export function StatTile({ value, label, onClick }: {
  value: string | number; label: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '14px 16px',
      cursor: onClick ? 'pointer' : undefined,
    }}>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 700,
        fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', color: 'var(--text)', lineHeight: 1.1,
      }}>
        {value}
      </p>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
        color: 'var(--text-dim)', letterSpacing: '0.04em', marginTop: '4px',
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
    </div>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px', marginBottom: '16px',
    }}>
      {children}
    </div>
  );
}

export function ChartGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px',
    }}>
      {children}
    </div>
  );
}

// Shared helper: count occurrences and return the top N, sorted desc.
export function topCounts(values: (string | null | undefined)[], n = 8): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
