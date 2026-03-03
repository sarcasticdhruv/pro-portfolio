import { Link } from 'react-router-dom';
import type { Post } from '../../lib/blog';
import { formatDate } from '../../lib/blog';
import TagPill from './TagPill';
import { Clock, CalendarDays } from 'lucide-react';

interface Props {
  post: Post;
}

export default function BlogCard({ post }: Props) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <article
        className="blog-card"
        style={{
          padding: '32px 0',
          /* separator adjusts to theme (white in dark mode) */
          borderBottom: '2px solid var(--divider-contrast)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        {/* Cover image (optional) */}
        {post.coverImage && (
          <div style={{
            width: '100%', aspectRatio: '16/7',
            borderRadius: '10px', overflow: 'hidden',
            marginBottom: '24px',
            border: '1px solid var(--border)',
          }}>
            <img
              src={post.coverImage}
              alt={post.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {post.tags.map(tag => <TagPill key={tag} tag={tag} small />)}
          </div>
        )}

        {/* Title */}
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
          lineHeight: 1.22,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          marginBottom: '12px',
          transition: 'color 0.18s',
        }} className="blog-card-title">
          {post.title}
        </h2>

        {/* Excerpt */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.95rem',
          lineHeight: 1.72,
          color: 'var(--text-muted)',
          marginBottom: '18px',
        }}>
          {post.excerpt}
        </p>

        {/* Meta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '18px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.02em',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CalendarDays size={12} />
            {formatDate(post.date)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} />
            {post.readingTime} min read
          </span>
        </div>
      </article>

      <style>{`
        .blog-card:hover .blog-card-title { color: var(--accent); }
        .blog-card:hover { opacity: 0.88; }
      `}</style>
    </Link>
  );
}
