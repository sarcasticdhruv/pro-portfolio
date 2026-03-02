import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPost, formatDate } from '../lib/blog';
import MarkdownRenderer from '../components/blog/MarkdownRenderer';
import ReadingProgress from '../components/blog/ReadingProgress';
import TagPill from '../components/blog/TagPill';
import { ArrowLeft, Clock, CalendarDays, Twitter, Link2 } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getPost(slug) : undefined;

  useEffect(() => {
    if (!post) { navigate('/blog', { replace: true }); return; }
    document.title = `${post.title} — Dhruv Choudhary`;
    // OG + description meta
    const setMeta = (sel: string, val: string) => {
      const el = document.querySelector<HTMLMetaElement>(sel);
      if (el) el.content = val;
    };
    setMeta('meta[name="description"]', post.excerpt);
    setMeta('meta[property="og:title"]', `${post.title} — Dhruv Choudhary`);
    setMeta('meta[property="og:description"]', post.excerpt);
    window.scrollTo(0, 0);
    return () => {
      document.title = 'Dhruv Choudhary — AI Engineer';
      setMeta('meta[name="description"]', 'Dhruv Choudhary — AI Engineer & Software Developer. Building scalable AI systems, GenAI solutions, and full-stack applications.');
      setMeta('meta[property="og:title"]', 'Dhruv Choudhary — AI Engineer');
      setMeta('meta[property="og:description"]', 'Building scalable AI systems and GenAI solutions.');
    };
  }, [post]);

  if (!post) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const twitterShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}&via=SarcasticDhruv`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  }

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
            fontWeight: 800,
            fontSize: 'clamp(1.9rem, 5.5vw, 2.8rem)',
            lineHeight: 1.14,
            letterSpacing: '-0.03em',
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
              <a
                href={twitterShare}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on X/Twitter"
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.68rem',
                  color: 'var(--text-dim)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
              >
                <Twitter size={12} />
                share
              </a>
              <button
                onClick={copyLink}
                title="Copy link"
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.68rem',
                  color: 'var(--text-dim)',
                  background: 'none',
                  padding: '6px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
              >
                <Link2 size={12} />
                copy link
              </button>
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
