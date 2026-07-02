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

  // Post-render DOM decoration: external links open in new tabs, and code
  // blocks get a header card (language label + copy button). Runs after
  // every html change; wrappers live inside the innerHTML so they are wiped
  // and rebuilt on re-render - no double wrapping.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach(a => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    const COPY_ICON =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    const CHECK_ICON =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

    el.querySelectorAll('pre').forEach(pre => {
      // Guard against StrictMode's double effect invocation in dev: once a
      // <pre> is wrapped in a .code-card, skip it on the re-run instead of
      // wrapping it again and leaving an empty shell card behind.
      if (pre.parentElement?.classList.contains('code-card')) return;
      const code = pre.querySelector('code');
      if (!code) return;
      const lang = (code.className.match(/language-([\w+-]+)/)?.[1] ?? 'code')
        .replace('plaintext', 'text');

      const card = document.createElement('div');
      card.className = 'code-card';
      pre.replaceWith(card);

      const header = document.createElement('div');
      header.className = 'code-card-header';

      const langLabel = document.createElement('span');
      langLabel.className = 'code-card-lang';
      langLabel.textContent = lang;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.innerHTML = `${COPY_ICON}<span>copy</span>`;
      btn.addEventListener('click', async () => {
        const text = code.innerText;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard API can be unavailable (http, old browsers)
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        btn.classList.add('copied');
        btn.innerHTML = `${CHECK_ICON}<span>copied</span>`;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `${COPY_ICON}<span>copy</span>`;
        }, 1600);
      });

      header.append(langLabel, btn);
      card.append(header, pre);
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

        /* Code cards (header with language + copy button, body with code) */
        .md-body .code-card {
          margin: 1.6em 0;
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          background: var(--surface-2);
        }
        .md-body .code-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px 6px 14px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
        }
        .md-body .code-card-lang {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          color: var(--text-dim);
          letter-spacing: 0.06em;
          text-transform: lowercase;
        }
        .md-body .code-copy-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 4px 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .md-body .code-copy-btn:hover {
          color: var(--accent);
          border-color: var(--border);
          background: var(--surface-2);
        }
        .md-body .code-copy-btn.copied {
          color: var(--accent);
        }
        .md-body pre {
          margin: 1.6em 0;
          padding: 0;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--surface-2);
        }
        .md-body .code-card pre {
          margin: 0;
          border: none;
          border-radius: 0;
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
        [data-theme="light"] .md-body .hljs-attr { color: #007acc; }
        [data-theme="light"] .md-body .hljs-built_in { color: #b35900; }

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

        /* Resource link cards - used for curated "further reading" lists */
        .md-body .resource-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
          margin: 1.6em 0;
        }
        .md-body .resource-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px 32px 14px 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface-2);
          text-decoration: none;
          transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
        }
        .md-body .resource-card:hover {
          border-color: var(--accent);
          background: var(--accent-glow);
          transform: translateY(-2px);
        }
        .md-body .resource-card::after {
          content: '\\2197';
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 0.9rem;
          color: var(--text-dim);
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .md-body .resource-card:hover::after {
          color: var(--accent);
          transform: translate(2px, -2px);
        }
        .md-body .resource-kind {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent);
        }
        .md-body .resource-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text);
          line-height: 1.3;
        }
        .md-body .resource-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          line-height: 1.55;
          color: var(--text-muted);
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
