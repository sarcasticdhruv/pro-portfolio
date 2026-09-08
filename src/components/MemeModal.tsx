import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Shuffle, ExternalLink, Link2, Check, X, ImageOff, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

export interface Meme { url: string; title: string; subreddit: string }

interface Props {
  meme: Meme;
  index: number;
  total: number;
  /** undefined at a boundary - the control renders disabled rather than missing,
   *  so paging never shifts the layout. */
  onPrev?: () => void;
  onNext?: () => void;
  onShuffle: () => void;
  onClose: () => void;
}

const iconBtn = (enabled: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px',
  background: 'transparent',
  border: '1px solid var(--border-2)',
  borderRadius: '8px',
  color: enabled ? 'var(--text-muted)' : 'var(--text-dim)',
  cursor: enabled ? 'pointer' : 'not-allowed',
  opacity: enabled ? 1 : 0.4,
  transition: 'color 0.16s, border-color 0.16s',
});

export default function MemeModal({ meme, index, total, onPrev, onNext, onShuffle, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 1 = fit to viewport. Zooming switches the frame to scrollable natural size.
  const [zoom, setZoom] = useState(1);
  // A trackpad flick emits a long stream of wheel events; this latches on the
  // first one that crosses the threshold and clears once the stream goes quiet,
  // so one physical gesture advances exactly one meme.
  const swipeLatch = useRef(false);
  const swipeTimer = useRef<number | undefined>(undefined);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  // Clipboard is unavailable on insecure origins - hide the control instead of
  // offering a button that silently does nothing.
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard;

  // Reset per-meme UI state when paging to a different image.
  useEffect(() => { setBroken(false); setCopied(false); setLoaded(false); setZoom(1); }, [meme.url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key === 'ArrowRight') onNext?.();
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      else if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
      else if (e.key === '0') setZoom(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  useEffect(() => () => window.clearTimeout(swipeTimer.current), []);

  // Lock body scroll, restoring whatever was there before rather than assuming ''.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Touchscreen equivalent, so the same gesture works on a phone.
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || zoom !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onNext?.();
    else onPrev?.();
  }

  // Horizontal trackpad swipe: right-to-left (deltaX > 0) goes to the next
  // meme. Registered natively with passive:false so preventDefault actually
  // suppresses the browser's swipe-to-go-back. Only while fit to the
  // viewport - zoomed, the frame scrolls instead.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (zoom !== 1) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 30) return;
      e.preventDefault();
      window.clearTimeout(swipeTimer.current);
      swipeTimer.current = window.setTimeout(() => { swipeLatch.current = false; }, 220);
      if (swipeLatch.current) return;
      swipeLatch.current = true;
      if (e.deltaX > 0) onNext?.();
      else onPrev?.();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, onNext, onPrev]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(meme.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard denied - leave the button idle */
    }
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={meme.title}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(7,17,10,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'memeModalFadeIn 0.18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-2)',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px var(--border)',
          width: 'min(920px, 100%)',
          maxHeight: '100%',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'memeModalSlideUp 0.22s cubic-bezier(.22,1,.36,1)',
        }}
      >
        {/* Top bar: identity left, actions right */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          background: 'var(--surface)',
        }}>
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {meme.title}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px',
            }}>
              r/{meme.subreddit}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
              disabled={zoom <= 1}
              style={iconBtn(zoom > 1)} title="Zoom out" aria-label="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
              disabled={zoom >= 4}
              style={iconBtn(zoom < 4)} title="Zoom in" aria-label="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button onClick={onShuffle} style={iconBtn(true)} title="Another one" aria-label="Another one">
              <Shuffle size={14} />
            </button>
            <a
              href={meme.url} target="_blank" rel="noopener noreferrer"
              style={{ ...iconBtn(true), textDecoration: 'none' }}
              title="Open original" aria-label="Open original"
            >
              <ExternalLink size={14} />
            </a>
            {canCopy && (
              <button onClick={copyLink} style={iconBtn(true)} title="Copy link" aria-label="Copy link">
                {copied ? <Check size={14} color="var(--accent)" /> : <Link2 size={14} />}
              </button>
            )}
            <button onClick={onClose} style={iconBtn(true)} title="Close" aria-label="Close">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Image - gets the viewport, not a 360px cap */}
        <div style={{
          flex: 1, minHeight: 0,
          position: 'relative',
          // isolate + zIndex 0 keeps the zoomed, overflowing image painted
          // strictly inside this frame instead of over the top bar.
          isolation: 'isolate',
          zIndex: 0,
          display: 'flex',
          // At fit, centre the image. Zoomed, start at top-left so scrolling
          // reveals the whole meme instead of clipping its edges.
          alignItems: zoom === 1 ? 'center' : 'flex-start',
          justifyContent: zoom === 1 ? 'center' : 'flex-start',
          padding: '14px',
          overflow: 'auto',
          overscrollBehavior: 'contain',
          // At fit there is nothing to pan, so let the browser hand us
          // horizontal gestures instead of treating them as scroll.
          touchAction: zoom === 1 ? 'pan-y' : 'auto',
        }}
        ref={frameRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        >
          {broken ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '56px 16px', color: 'var(--text-dim)',
            }}>
              <ImageOff size={22} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
                this one didn't load
              </span>
            </div>
          ) : (
            <>
              {!loaded && (
                <div style={{ position: 'absolute', color: 'var(--text-dim)' }}>
                  <Loader2 size={24} className="spin" />
                </div>
              )}
              <img
                src={meme.url}
                alt={meme.title}
                onError={() => setBroken(true)}
                onLoad={() => setLoaded(true)}
                onClick={() => setZoom(z => (z === 1 ? 2 : 1))}
                style={{
                  // At fit, bound by the viewport. Zoomed, take natural width
                  // and let the frame scroll - that's what makes dense
                  // multi-panel memes actually readable.
                  maxWidth: zoom === 1 ? '100%' : 'none',
                  maxHeight: zoom === 1 ? '82vh' : 'none',
                  width: zoom === 1 ? 'auto' : `${zoom * 100}%`,
                  objectFit: 'contain', display: 'block',
                  borderRadius: '8px',
                  cursor: zoom === 1 ? 'zoom-in' : 'zoom-out',
                  opacity: loaded ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              />
            </>
          )}
        </div>

        {/* Bottom: paging + keyboard hint */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
          padding: '12px 14px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          background: 'var(--surface)',
        }}>
          <button
            onClick={onPrev} disabled={!onPrev}
            style={iconBtn(!!onPrev)} title="Previous" aria-label="Previous"
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem', color: 'var(--text-dim)',
            minWidth: '58px', textAlign: 'center',
          }}>
            {index + 1} / {total}
          </span>
          <button
            onClick={onNext} disabled={!onNext}
            style={iconBtn(!!onNext)} title="Next" aria-label="Next"
          >
            <ChevronRight size={15} />
          </button>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.64rem', color: 'var(--text-dim)',
            marginLeft: '6px', opacity: 0.75,
          }}>
            ← → · +/− zoom · esc
          </span>
        </div>
      </div>

      <style>{`
        @keyframes memeModalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .spin { animation: memeModalSpin 0.8s linear infinite; }
        @keyframes memeModalSpin { to { transform: rotate(360deg); } }
        @keyframes memeModalSlideUp {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
