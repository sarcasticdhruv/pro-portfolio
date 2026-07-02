import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, CircleCheck, CircleX, Loader2, History, ChevronDown, ChevronUp, TrendingUp,
  Trash2, X, ArrowUpRight, RotateCw, FileText, FolderGit2, Briefcase, Award, Wrench, User, Globe,
} from 'lucide-react';
import { runSearch, type AgentStep, type SearchResult } from '../lib/searchAgent';
import {
  loadHistory, saveToHistory, findCached, removeFromHistory, clearHistory,
  type HistoryEntry,
} from '../lib/searchHistory';
import MarkdownRenderer from '../components/blog/MarkdownRenderer';
import { useSEO } from '../hooks/useSEO';

// Pools rotate on every page load: 2 random about-me + 2 random trending
const ABOUT_POOL = [
  'What projects has Dhruv built?',
  'What is his experience with GenAI?',
  'Tell me about the brain tumor research',
  'What is the Helix framework he built?',
  'What does he do at AI LifeBOT?',
  'What are his skills and certifications?',
  'How do I contact Dhruv?',
  'What has he written about shipping AI to production?',
];

// Shown until the live trending fetch resolves (or if it fails)
const TRENDING_FALLBACK = [
  'What is RAG and when does it fail?',
  'Biggest AI announcements this week',
  'Explain agentic AI in simple terms',
  'What is semantic caching for LLMs?',
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const KIND_ICONS: Record<string, typeof FileText> = {
  blog: FileText,
  project: FolderGit2,
  experience: Briefcase,
  achievement: Award,
  skills: Wrench,
  about: User,
  web: Globe,
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [liveAnswer, setLiveAnswer] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [aboutChips] = useState<string[]>(() => pickRandom(ABOUT_POOL, 2));
  const [trending, setTrending] = useState<string[]>(() => pickRandom(TRENDING_FALLBACK, 2));
  const inputRef = useRef<HTMLInputElement>(null);

  useSEO({
    title: 'Search',
    description: 'Ask anything about Dhruv Choudhary\'s projects, experience, and writing.',
    noindex: true,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Live trending suggestions from the HN front page (keyless, CORS-open).
  // Falls back to the static pair if the fetch fails.
  useEffect(() => {
    let cancelled = false;
    fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const titles = (d?.hits ?? [])
          .map((h: any) => h?.title as string)
          .filter((t: string) => t && t.length >= 15 && t.length <= 65);
        if (!cancelled && titles.length >= 2) setTrending(pickRandom(titles, 2));
      })
      .catch(() => {
        // Keep fallback suggestions
      });
    return () => { cancelled = true; };
  }, []);

  async function execute(q: string) {
    setRunning(true);
    setResult(null);
    setSteps([]);
    setLiveAnswer('');
    const res = await runSearch(q, {
      onSteps: setSteps,
      onToken: setLiveAnswer,
    });
    setResult(res);
    setRunning(false);
    if (res.answer || res.sources.length > 0) {
      setHistory(saveToHistory(res));
    }
  }

  function submit(raw: string, opts?: { skipCache?: boolean }) {
    const q = raw.trim();
    if (!q || running) return;
    setQuery(q);
    if (!opts?.skipCache) {
      const cached = findCached(q);
      if (cached) {
        setSteps([]);
        setLiveAnswer('');
        setResult({ ...cached, fromCache: true });
        return;
      }
    }
    void execute(q);
  }

  function restore(entry: HistoryEntry) {
    if (running) return;
    setQuery(entry.query);
    setSteps([]);
    setLiveAnswer('');
    setResult({ ...entry, fromCache: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(query);
  };

  // Fresh session: clear the current query/result (history stays)
  function newSession() {
    if (running) return;
    setQuery('');
    setSteps([]);
    setLiveAnswer('');
    setResult(null);
    inputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showAnswer = running ? liveAnswer : result?.answer ?? '';
  const idle = !running && !result;

  return (
    <main id="search-page" style={{ minHeight: '100vh', paddingTop: '110px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 24px)' }}>
        {/* Header */}
        <p className="label" style={{ marginBottom: '12px' }}>~/search</p>
        <h1
          className="font-display"
          onClick={newSession}
          title="start a new search"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, marginBottom: '6px', cursor: 'pointer', userSelect: 'none' }}
        >
          Ask <span style={{ color: 'var(--accent)' }}>anything.</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>
          Agentic search over the web.
        </p>

        {/* Search box */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: '10px', padding: '6px 6px 6px 16px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <Search size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ask about dhruv, his work, or anything else..."
            disabled={running}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.88rem', padding: '10px 0', minWidth: 0,
            }}
          />
          <button
            onClick={() => submit(query)}
            disabled={running || !query.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: running || !query.trim() ? 'var(--surface-2)' : 'var(--accent)',
              color: running || !query.trim() ? 'var(--text-dim)' : 'var(--chat-user-text)',
              border: 'none', borderRadius: '7px', padding: '10px 16px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', fontWeight: 600,
              cursor: running || !query.trim() ? 'default' : 'pointer',
              transition: 'all 0.18s ease', flexShrink: 0,
            }}>
            {running && <Loader2 size={13} className="spin-slow" />}
            {running ? 'searching' : 'search'}
          </button>
        </div>

        {/* Suggestions (idle only): 2 about Dhruv + 2 live trending */}
        {idle && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            {aboutChips.map(s => (
              <button key={s} onClick={() => submit(s)} className="search-chip">{s}</button>
            ))}
            {trending.map(s => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="search-chip"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={11} style={{ flexShrink: 0 }} />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Agent step timeline — collapsed to one line, expandable */}
        {(running || (result && !result.fromCache)) && steps.length > 0 && (
          <StepTimeline steps={steps} running={running} />
        )}

        {/* Cache notice */}
        {result?.fromCache && (
          <div className="search-cache-notice" style={{
            marginTop: '26px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--text-dim)',
          }}>
            <History size={12} style={{ flexShrink: 0 }} />
            restored from device history, no API call
            <button onClick={() => submit(result.query, { skipCache: true })} className="search-chip" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <RotateCw size={11} /> re-run
            </button>
          </div>
        )}

        {/* Image grid (Perplexity-style, above the answer) */}
        {result && !running && (result.images?.length ?? 0) > 0 && (
          <div className="search-img-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '8px', marginTop: '18px',
          }}>
            {result.images!.map(img => (
              <a
                key={img.url}
                href={img.link}
                target="_blank"
                rel="noopener noreferrer"
                title={img.title}
                style={{
                  display: 'block', borderRadius: '9px', overflow: 'hidden',
                  border: '1px solid var(--border)', lineHeight: 0,
                  background: 'var(--surface-2)',
                }}>
                <img
                  src={img.url}
                  alt={img.title}
                  loading="lazy"
                  onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                />
              </a>
            ))}
          </div>
        )}

        {/* Answer */}
        {(showAnswer || (result?.degraded && !running)) && (
          <div className="search-answer-box" style={{
            marginTop: '18px', padding: '22px 24px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '10px',
          }}>
            {result?.degraded && !showAnswer ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                AI is unavailable right now (provider quota or network). Here are the matching
                pages from this site instead.
              </p>
            ) : (
              <div className="search-answer">
                <MarkdownRenderer content={showAnswer} />
              </div>
            )}
            {result && !running && !result.degraded && (
              <p style={{
                marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: 'var(--text-dim)',
              }}>
                lane: {result.lane}{result.agentsUsed ? ` · ${result.agentsUsed} agents` : ''}{result.fromCache ? ' · cached' : ''}
              </p>
            )}
          </div>
        )}

        {/* Source cards — collapsed, expandable */}
        {result && result.sources.length > 0 && !running && (
          <SourcesPanel key={result.query} sources={result.sources} />
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <p className="label" style={{ fontSize: '0.68rem' }}>
                <History size={11} style={{ verticalAlign: '-1px', marginRight: '6px' }} />
                history
              </p>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <button
                onClick={() => { clearHistory(); setHistory([]); }}
                className="search-chip"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Trash2 size={11} /> clear all
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {history.map(entry => (
                <div key={entry.id} className="search-history-row" onClick={() => restore(entry)}>
                  <Search size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <span style={{
                    flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: 'var(--text-muted)', fontSize: '0.82rem',
                  }}>
                    {entry.query}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                    {timeAgo(entry.createdAt)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setHistory(removeFromHistory(entry.id)); }}
                    title="remove"
                    className="search-history-remove"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '3px',
                      color: 'var(--text-dim)', display: 'flex', flexShrink: 0,
                    }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin-slow-kf { to { transform: rotate(360deg); } }
        .spin-slow { animation: spin-slow-kf 1s linear infinite; }
        .search-chip {
          padding: 6px 12px; border-radius: 6px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-dim); font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem; cursor: pointer; transition: all 0.18s ease;
        }
        .search-chip:hover { border-color: var(--accent); color: var(--accent); }
        .search-history-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 6px; cursor: pointer;
          transition: background 0.15s ease;
        }
        .search-history-row:hover { background: var(--surface-2); }
        .search-answer .md-body { font-size: 0.94rem; line-height: 1.75; }
        .search-answer .md-body > *:first-child { margin-top: 0; }
        .search-answer .md-body > *:last-child { margin-bottom: 0; }

        /* iOS Safari zooms the page on focus if an input's font-size is under
           16px — keep it at 16px on touch-sized viewports to avoid that. */
        @media (max-width: 640px) {
          #search-page { padding-top: 88px !important; }
          .search-input { font-size: 16px !important; }
          .search-answer-box { padding: 16px 16px !important; }
          .search-chip { padding: 8px 12px !important; }
        }
        @media (hover: none) {
          .search-history-remove { padding: 8px !important; }
        }
      `}</style>
    </main>
  );
}

function StepTimeline({ steps, running }: { steps: AgentStep[]; running: boolean }) {
  const [open, setOpen] = useState(false);
  const current = [...steps].reverse().find(s => s.status === 'running') ?? steps[steps.length - 1];
  const doneCount = steps.filter(s => s.status !== 'running').length;

  return (
    <div style={{
      marginTop: '26px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '10px', overflow: 'hidden',
    }}>
      {/* Collapsed summary row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', textAlign: 'left',
        }}>
        {running
          ? <Loader2 size={13} className="spin-slow" style={{ color: 'var(--accent)', flexShrink: 0 }} />
          : <CircleCheck size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {running ? current?.label : `Done · ${doneCount} step${doneCount === 1 ? '' : 's'}`}
          </span>
          {running && current?.detail && (
            <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              · {current.detail}
            </span>
          )}
        </span>
        <span style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
          color: 'var(--text-dim)', flexShrink: 0,
        }}>
          {open ? 'hide' : 'steps'}
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {/* Expanded full timeline */}
      {open && (
        <div style={{
          padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: '10px',
          borderTop: '1px solid var(--border)', paddingTop: '12px',
        }}>
          {steps.map(step => (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem',
            }}>
              {step.status === 'running' && <Loader2 size={13} className="spin-slow" style={{ color: 'var(--accent)' }} />}
              {step.status === 'done' && <CircleCheck size={13} style={{ color: 'var(--accent)' }} />}
              {step.status === 'error' && <CircleX size={13} style={{ color: '#e05c5c' }} />}
              <span style={{ color: step.status === 'running' ? 'var(--text)' : 'var(--text-muted)' }}>
                {step.label}
              </span>
              {step.detail && <span style={{ color: 'var(--text-dim)' }}>· {step.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourcesPanel({ sources }: { sources: { title: string; url: string; kind: string; snippet: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      marginTop: '14px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '10px', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', textAlign: 'left',
        }}>
        <FileText size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ color: 'var(--text)' }}>
          sources · {sources.length}
        </span>
        <span style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
          color: 'var(--text-dim)', flexShrink: 0,
        }}>
          {open ? 'hide' : 'show'}
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {open && (
        <div style={{
          padding: '12px 16px 16px', borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px',
        }}>
          {sources.map((s, i) => <SourceCard key={s.url + i} index={i + 1} source={s} />)}
        </div>
      )}
    </div>
  );
}

function SourceCard({ index, source }: { index: number; source: { title: string; url: string; kind: string; snippet: string } }) {
  const [hovered, setHovered] = useState(false);
  const Icon = KIND_ICONS[source.kind] ?? FileText;
  const isRoute = source.url.startsWith('/blog');

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
          color: 'var(--accent)', background: 'var(--accent-glow)',
          border: '1px solid var(--tag-border)', borderRadius: '4px', padding: '1px 6px',
        }}>
          [{index}]
        </span>
        <Icon size={12} style={{ color: 'var(--text-dim)' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.64rem', color: 'var(--text-dim)' }}>
          {source.kind}
        </span>
        <ArrowUpRight size={12} style={{ marginLeft: 'auto', color: hovered ? 'var(--accent)' : 'var(--text-dim)', transition: 'color 0.15s' }} />
      </div>
      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
        {source.title}
      </p>
      <p style={{
        fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {source.snippet}
      </p>
    </>
  );

  const style: React.CSSProperties = {
    display: 'block', padding: '13px 15px',
    background: 'var(--surface)', border: '1px solid',
    borderColor: hovered ? 'var(--accent-dim)' : 'var(--border)',
    borderRadius: '9px', textDecoration: 'none',
    transition: 'all 0.18s ease',
    transform: hovered ? 'translateY(-2px)' : 'none',
  };

  const isExternal = source.url.startsWith('http');

  return isRoute ? (
    <Link to={source.url} style={style} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {inner}
    </Link>
  ) : (
    <a
      href={source.url}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {inner}
    </a>
  );
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
