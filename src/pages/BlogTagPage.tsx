import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ALL_POSTS } from '../lib/blog';
import BlogCard from '../components/blog/BlogCard';
import { useSEO } from '../hooks/useSEO';
import { Tag as TagIcon } from 'lucide-react';

export default function BlogTagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const needle = tag?.toLowerCase();
  const posts = needle ? ALL_POSTS.filter(p => p.tags.some(t => t.toLowerCase() === needle)) : [];
  const label = posts[0]?.tags.find(t => t.toLowerCase() === needle) ?? tag ?? '';

  useEffect(() => {
    if (!needle || posts.length === 0) navigate('/blog', { replace: true });
  }, [needle, posts.length, navigate]);

  useSEO({
    title: `${label} posts`,
    description: `${posts.length} post${posts.length === 1 ? '' : 's'} tagged ${label}, by Dhruv Choudhary.`,
  });

  if (posts.length === 0) return null;

  return (
    <main style={{
      minHeight: '100vh',
      paddingTop: '96px',
      paddingBottom: '80px',
      animation: 'blogFadeIn 0.35s ease both',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '56px' }}>
          <div className="page-breadcrumb" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.05em',
            marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
          }}>
            <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>~/dhruv</Link>
            <span>/</span>
            <Link to="/blog" style={{ color: 'var(--accent)', textDecoration: 'none' }}>blog</Link>
            <span>/</span>
            <span>tag</span>
            <span>/</span>
            <span>{label}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <TagIcon size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
              letterSpacing: '-0.03em',
              color: 'var(--text)',
              lineHeight: 1.1,
            }}>
              {label}<span style={{ color: 'var(--accent)' }}>.</span>
            </h1>
          </div>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.97rem',
            lineHeight: 1.72,
            color: 'var(--text-muted)',
            maxWidth: '540px',
          }}>
            {posts.length} post{posts.length === 1 ? '' : 's'} on this subject.
          </p>
        </div>

        <div style={{ borderTop: '3px solid var(--divider-contrast)', marginBottom: '0' }} />

        {posts.map(post => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      <style>{`
        @keyframes blogFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
