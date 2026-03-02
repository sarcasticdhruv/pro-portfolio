import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ALL_POSTS } from '../lib/blog';
import BlogCard from '../components/blog/BlogCard';
import { PenLine } from 'lucide-react';

export default function BlogListPage() {
  // Update page title
  useEffect(() => {
    document.title = 'Blog — Dhruv Choudhary';
    return () => { document.title = 'Dhruv Choudhary — AI Engineer'; };
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      paddingTop: '96px',
      paddingBottom: '80px',
      animation: 'blogFadeIn 0.35s ease both',
    }}>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          {/* Breadcrumb */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.05em',
            marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>~/dhruv</Link>
            <span>/</span>
            <span>blog</span>
          </div>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <PenLine size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
              letterSpacing: '-0.03em',
              color: 'var(--text)',
              lineHeight: 1.1,
            }}>
              Writing
            </h1>
          </div>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.97rem',
            lineHeight: 1.72,
            color: 'var(--text-muted)',
            maxWidth: '540px',
          }}>
            Thinking out loud about AI systems, production engineering, and what it means
            to build things that matter. Not tutorials. Not hot takes. Just honest notes
            from someone trying to figure it out.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '0' }} />

        {/* Post list */}
        {ALL_POSTS.length === 0 ? (
          <div style={{
            paddingTop: '64px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
          }}>
            no posts yet — check back soon
          </div>
        ) : (
          ALL_POSTS.map(post => (
            <BlogCard key={post.slug} post={post} />
          ))
        )}
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
