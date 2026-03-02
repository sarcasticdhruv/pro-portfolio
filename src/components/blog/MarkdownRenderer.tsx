import { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// Configure marked once (module-level, runs once)
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

marked.use({
  gfm: true,
  breaks: false,
});

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const html = useMemo(() => marked.parse(content) as string, [content]);

  // Add target="_blank" to all external links after render
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach(a => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }, [html]);

  return (
    <>
      <div
        ref={ref}
        className="md-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        /* ── Markdown body ─────────────────────────────────────── */
        .md-body {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.05rem;
          line-height: 1.82;
          color: var(--text-muted);
        }

        .md-body h1,
        .md-body h2,
        .md-body h3,
        .md-body h4 {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          margin: 2.2em 0 0.6em;
          line-height: 1.25;
        }
        .md-body h1 { font-size: 1.85rem; }
        .md-body h2 { font-size: 1.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35em; }
        .md-body h3 { font-size: 1.1rem; }
        .md-body h4 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }

        .md-body p {
          margin: 0 0 1.35em;
        }

        .md-body a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.15s;
        }
        .md-body a:hover { color: var(--accent-hover); }

        .md-body strong {
          font-weight: 600;
          color: var(--text);
        }
        .md-body em {
          font-style: italic;
          color: var(--text);
        }

        .md-body ul,
        .md-body ol {
          margin: 0 0 1.35em 1.2em;
          padding: 0;
        }
        .md-body li { margin-bottom: 0.38em; }

        /* Blockquote */
        .md-body blockquote {
          margin: 1.8em 0;
          padding: 1em 1.4em;
          border-left: 3px solid var(--accent-dim);
          background: var(--surface-2);
          border-radius: 0 8px 8px 0;
          color: var(--text-muted);
          font-style: italic;
        }
        .md-body blockquote p { margin: 0; }

        /* Horizontal rule */
        .md-body hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2.5em 0;
        }

        /* Inline code */
        .md-body code:not(pre code) {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85em;
          background: var(--surface-2);
          border: 1px solid var(--border);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--accent);
        }

        /* Code blocks */
        .md-body pre {
          margin: 1.6em 0;
          padding: 0;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--surface-2);
        }
        .md-body pre code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          line-height: 1.7;
          display: block;
          padding: 1.2em 1.4em;
          overflow-x: auto;
          background: transparent;
          color: var(--text);
        }

        /* highlight.js overrides - works in both dark & light */
        .md-body .hljs { background: transparent; }
        .md-body .hljs-keyword,
        .md-body .hljs-selector-tag { color: #8be9fd; }
        .md-body .hljs-string { color: #a8ff78; }
        .md-body .hljs-comment { color: var(--text-dim); font-style: italic; }
        .md-body .hljs-number { color: #ffb86c; }
        .md-body .hljs-function,
        .md-body .hljs-title { color: #50fa7b; }
        .md-body .hljs-type { color: #bd93f9; }
        .md-body .hljs-attr { color: #8be9fd; }
        .md-body .hljs-built_in { color: #ffb86c; }
        [data-theme="light"] .md-body .hljs-keyword,
        [data-theme="light"] .md-body .hljs-selector-tag { color: #007acc; }
        [data-theme="light"] .md-body .hljs-string { color: #008000; }
        [data-theme="light"] .md-body .hljs-comment { color: #999; }
        [data-theme="light"] .md-body .hljs-number { color: #c04; }
        [data-theme="light"] .md-body .hljs-function,
        [data-theme="light"] .md-body .hljs-title { color: #005a9e; }
        [data-theme="light"] .md-body .hljs-type { color: #7a3e9d; }

        /* Tables */
        .md-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.6em 0;
          font-size: 0.9rem;
        }
        .md-body th {
          background: var(--surface-2);
          border: 1px solid var(--border);
          padding: 10px 14px;
          text-align: left;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .md-body td {
          border: 1px solid var(--border);
          padding: 9px 14px;
          vertical-align: top;
        }
        .md-body tr:nth-child(even) td { background: var(--surface-2); }

        /* Images */
        .md-body img {
          max-width: 100%;
          border-radius: 10px;
          display: block;
          margin: 1.8em auto;
          border: 1px solid var(--border);
        }

        /* YouTube / video embeds */
        .md-body iframe {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 10px;
          border: 1px solid var(--border);
          margin: 1.6em 0;
          display: block;
        }
        .md-body video {
          width: 100%;
          border-radius: 10px;
          margin: 1.6em 0;
          display: block;
        }
      `}</style>
    </>
  );
}
