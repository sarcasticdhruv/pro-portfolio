interface Props {
  tag: string;
  small?: boolean;
}

export default function TagPill({ tag, small = false }: Props) {
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '2px 8px' : '3px 11px',
      borderRadius: '100px',
      background: 'var(--tag-bg)',
      border: '1px solid var(--tag-border)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: small ? '0.62rem' : '0.68rem',
      color: 'var(--accent)',
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {tag}
    </span>
  );
}
