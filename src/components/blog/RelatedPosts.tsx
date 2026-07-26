import { Link } from 'react-router-dom';
import type { Post } from '../../lib/blog';
import { ALL_POSTS } from '../../lib/blog';
import { getRelatedPosts } from '../../lib/relatedPosts.mjs';

interface Props {
  post: Post;
}

export default function RelatedPosts({ post }: Props) {
  const related = getRelatedPosts(post, ALL_POSTS, 3);
  if (related.length === 0) return null;

  return (
    <div style={{ marginTop: '48px' }}>
      <p className="label" style={{ fontSize: '0.68rem', marginBottom: '16px' }}>
        related posts
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {related.map(p => (
          <Link
            key={p.slug}
            to={`/blog/${p.slug}`}
            style={{
              display: 'block', padding: '13px 14px', borderRadius: '8px',
              textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
          >
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9rem',
              color: 'var(--text)', marginBottom: '4px',
            }}>
              {p.title}
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem',
              color: 'var(--text-dim)', lineHeight: 1.5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {p.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
