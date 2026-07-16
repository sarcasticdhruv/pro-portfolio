import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPost, formatDate } from '../lib/blog';
import MarkdownRenderer from '../components/blog/MarkdownRenderer';
import ReadingProgress from '../components/blog/ReadingProgress';
import TagPill from '../components/blog/TagPill';
import ShareMenu from '../components/blog/ShareMenu';
import { useSEO } from '../hooks/useSEO';
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getPost(slug) : undefined;

  useEffect(() => {
    if (!post) navigate('/blog', { replace: true });
    else window.scrollTo(0, 0);
  }, [post, navigate]);

  useSEO({ title: post?.title, description: post?.excerpt });

  if (!post) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <ReadingProgress />

      <main style={{
        paddingTop: '80px',
        paddingBottom: '100px',
        animation: 'postFadeIn 0.38s ease both',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px' }}>

          {/* ── Back link ── */}
          <Link
            to="/blog"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              marginBottom: '40px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}
          >
            <ArrowLeft size={13} />
            back to blog
          </Link>

          {/* ── Cover image ── */}
          {post.coverImage && (
            <div style={{
              width: '100%', aspectRatio: '16/7',
              borderRadius: '12px', overflow: 'hidden',
              marginBottom: '40px',
              border: '1px solid var(--border)',
            }}>
              <img
                src={post.coverImage}
                alt={post.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          {/* ── Tags ── */}
          {post.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {post.tags.map(tag => <TagPill key={tag} tag={tag} />)}
            </div>
          )}

          {/* ── Title ── */}
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(1.7rem, 4.5vw, 2.4rem)',
            lineHeight: 1.24,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            marginBottom: '20px',
          }}>
            {post.title}
          </h1>

          {/* ── Meta row ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            flexWrap: 'wrap',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.02em',
            marginBottom: '36px',
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

          {/* ── Elegant divider ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            marginBottom: '44px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0,
            }} />
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* ── Markdown body ── */}
          <article>
            <MarkdownRenderer content={post.content} />
          </article>

          {/* ── Bottom divider ── */}
          <div style={{
            height: '1px', background: 'var(--border)',
            margin: '56px 0 40px',
          }} />

          {/* ── Footer row: tags + share ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '24px', flexWrap: 'wrap',
          }}>
            {/* Tags */}
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {post.tags.map(tag => <TagPill key={tag} tag={tag} />)}
              </div>
            )}

            {/* Share */}
            <div style={{ marginLeft: 'auto' }}>
              <ShareMenu title={post.title} url={shareUrl} />
            </div>
          </div>

          {/* ── Back to blog (bottom) ── */}
          <div style={{ marginTop: '48px' }}>
            <Link
              to="/blog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}
            >
              <ArrowLeft size={14} />
              all posts
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes postFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
