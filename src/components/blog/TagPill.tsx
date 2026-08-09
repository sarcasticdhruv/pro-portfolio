import { Link } from 'react-router-dom';

interface Props {
  tag: string;
  small?: boolean;
  /** Links to the /blog/tag/:tag archive page. Only safe where TagPill isn't
   *  already nested inside another <Link> (e.g. not inside BlogCard, which
   *  wraps the whole card - nested anchors are invalid HTML). */
  linkable?: boolean;
}

export default function TagPill({ tag, small = false, linkable = false }: Props) {
  const style = {
    display: 'inline-block',
    padding: small ? '2px 8px' : '3px 11px',
    borderRadius: '100px',
    background: 'var(--tag-bg)',
    border: '1px solid var(--tag-border)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: small ? '0.62rem' : '0.68rem',
    color: 'var(--accent)',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
    transition: 'background 0.15s ease',
  };

  if (linkable) {
    return (
      <Link
        to={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
        style={style}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--accent-glow-strong)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--tag-bg)')}
      >
        {tag}
      </Link>
    );
  }

  return <span style={style}>{tag}</span>;
}
