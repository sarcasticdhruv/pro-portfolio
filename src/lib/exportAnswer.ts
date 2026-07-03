// Client-side export of a search answer to PDF / DOCX / HTML.
//
// The answer already exists as markdown (the model is done), so this is a pure
// format transform - no LLM call, no backend. The heavy libraries (pdfmake,
// docx) are dynamically imported so they only load when someone clicks export,
// keeping them out of the initial bundle.
//
// Styling target: the site's own type system + Claude's clean-document feel -
// generous whitespace, a thin green accent rule, clear hierarchy.
import { marked } from 'marked';

export interface ExportSource {
  title: string;
  url: string;
}

export type DocFormat = 'pdf' | 'docx' | 'html';

// Detect when a query is asking for the answer AS a downloadable document,
// ChatGPT/Claude style ("make a pdf of X", "give me a word doc about Y",
// "export as html"). Returns the requested format, or null for a normal query.
export function detectDocIntent(q: string): DocFormat | null {
  const s = q.toLowerCase().trim();
  const fmt: DocFormat | null =
    /\bpdf\b/.test(s) ? 'pdf'
    : /\b(word|docx|word ?doc(?:ument)?|\.docx?)\b/.test(s) ? 'docx'
    : /\b(html|web ?page)\b/.test(s) ? 'html'
    : null;
  if (!fmt) return null;

  const asksToMake =
    /\b(make|create|give|gen(?:erate)?|export|save|download|turn|convert|write|produce|need|want|prepare|as an?|in)\b/.test(s) ||
    /^(a |an )?(pdf|word|docx|html)\b/.test(s) || // "pdf of google's evolution"
    /(pdf|word|docx|html)\s+(of|on|about|for|version)\b/.test(s);

  return asksToMake ? fmt : null;
}

export type DocKind = 'resume' | 'project' | 'code' | 'article';

// What KIND of document is being asked for, so the export is shaped like the
// real thing instead of the same "article + sources" wrapper for everything -
// a resume request should read like a resume, a project request like a
// project brief/README, a code request like actual code.
export function detectDocKind(q: string): DocKind {
  const s = q.toLowerCase();
  if (/\b(resume|cv|curriculum vitae)\b/.test(s)) return 'resume';
  if (/\breadme\b/.test(s) || (/\bproject/.test(s) && /\b(file|brief|doc(?:ument)?|summary|overview|report|write-?up)\b/.test(s))) {
    return 'project';
  }
  if (/\b(code|snippet|script|function|component|webpage|web ?page|website|html page|program|source)\b/.test(s)) {
    return 'code';
  }
  return 'article';
}

// A query asking to *generate* an image (not find real photos).
export function hasImageGenIntent(q: string): boolean {
  return (
    /\b(generate|create|make|draw|design|render|imagine|paint)\b/i.test(q) &&
    /\b(image|images|picture|pic|photo|logo|poster|illustration|art|artwork|wallpaper|icon|drawing|banner)\b/i.test(q)
  );
}

// Strip leading "make/generate a(n) image/pdf/... of" and trailing "as a pdf"
// framing to get the bare subject, so the search answers ABOUT the topic and
// image/web results are relevant. Falls back to the original if nothing is left.
export function extractTopic(q: string): string {
  let s = q.trim();
  s = s.replace(/^\s*(please\s+)?(make|create|give(?:\s+me)?|generate|gen|draw|design|render|paint|imagine|produce|show(?:\s+me)?|export|save|download|turn(?:\s+(?:this|it))?(?:\s+into)?|write|prepare|convert)\b/i, '');
  s = s.replace(/^\s*(me\s+)?(a|an|the|some)?\s*(images?|pictures?|pics?|photos?|logo|poster|illustration|art(?:work)?|drawing|wallpaper|icon|banner|pdf|word\s?doc(?:ument)?|word|docx|html|web\s?page|document|file)s?\b/i, '');
  s = s.replace(/^\s*(of|about|on|for|showing|depicting|with|covering)\b/i, '');
  s = s.replace(/\b(as|in|to)\s+(a|an)?\s*(pdf|word\s?doc(?:ument)?|word|docx|html|web\s?page|image|picture|photo)(\s+(format|file|document))?\s*$/i, '');
  s = s.replace(/^[\s\-–—:,]+/, '').replace(/[\s\-–—:,]+$/, '').trim();
  return s || q.trim();
}

// Site green, nudged slightly deeper so it stays legible on white paper.
const ACCENT = '#00A65A';
const SITE = 'dhruv-choudhary.tech';
const INK = '#1A1A1A';
const MUTED = '#6B7280';

// Turn a request like "make a pdf of google's evolution" into the clean topic
// title "Google's evolution" for the document heading and filename.
export function cleanExportTitle(q: string): string {
  let s = q.trim();
  s = s.replace(/^\s*(please\s+)?(make|create|give(?:\s+me)?|generate|gen|export|save|download|turn(?:\s+(?:this|it))?(?:\s+into)?|write|produce|prepare|convert)\b/i, '');
  s = s.replace(/^\s*(me\s+)?(a|an|the)?\s*(pdf|word\s?doc(?:ument)?|word|docx|html|web\s?page|document|file)\b/i, '');
  s = s.replace(/^\s*(of|about|on|for|covering)\b/i, '');
  s = s.replace(/\b(as|in|to)\s+(a|an)?\s*(pdf|word\s?doc(?:ument)?|word|docx|html|web\s?page)(\s+(format|file|document))?\s*$/i, '');
  s = s.replace(/\b(pdf|docx|html)\s*$/i, '');
  s = s.replace(/^[\s\-–—:,]+/, '').replace(/[\s\-–—:,]+$/, '').trim();
  if (!s) return q.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function today(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function slugify(q: string): string {
  return (
    q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'answer'
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// A fenced code block that's itself a complete HTML document - when someone
// asks for an actual webpage, the download should BE that runnable file, not
// a description of it wrapped in the site's article template.
function extractRawHtmlDoc(answerMd: string): string | null {
  for (const tok of marked.lexer(answerMd) as any[]) {
    if (tok.type === 'code' && /<!doctype html|<html[\s>]/i.test(tok.text)) return tok.text;
  }
  return null;
}

// ── HTML ────────────────────────────────────────────────────────────────────
export function downloadHtml(query: string, answerMd: string, sources: ExportSource[]): void {
  const title = cleanExportTitle(query);
  const kind = detectDocKind(query);

  if (kind === 'code') {
    const raw = extractRawHtmlDoc(answerMd);
    if (raw) {
      triggerDownload(new Blob([raw], { type: 'text/html;charset=utf-8' }), `${slugify(title)}.html`);
      return;
    }
  }

  const body = marked.parse(answerMd) as string;
  // Citations/web sources only make sense for a general researched answer -
  // a resume, project brief or code snippet doesn't need a "Sources" list.
  const srcHtml = sources.length && kind === 'article'
    ? `<h2>Sources</h2><ol class="sources">${sources
        .map(s => `<li><a href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a></li>`)
        .join('')}</ol>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>
  :root { --accent:${ACCENT}; --ink:${INK}; --muted:${MUTED}; }
  * { box-sizing: border-box; }
  body { margin:0; background:#faf9f6; color:var(--ink);
    font-family:'DM Sans',system-ui,sans-serif; line-height:1.72;
    -webkit-font-smoothing:antialiased; }
  main { max-width:720px; margin:0 auto; padding:64px 28px 96px; }
  .meta { font-family:'JetBrains Mono',monospace; font-size:.72rem;
    letter-spacing:.04em; color:var(--muted); text-transform:uppercase; }
  h1 { font-family:'Syne',sans-serif; font-weight:800; font-size:2rem;
    line-height:1.15; letter-spacing:-.02em; margin:.5rem 0 .9rem; }
  .rule { height:3px; width:100%; background:var(--accent); border-radius:2px; margin-bottom:2.2rem; }
  article h1,article h2,article h3 { font-family:'Syne',sans-serif; font-weight:700;
    letter-spacing:-.01em; line-height:1.25; margin:1.8em 0 .6em; }
  article h2 { font-size:1.3rem; } article h3 { font-size:1.08rem; }
  p { margin:0 0 1.15em; } a { color:var(--accent); text-underline-offset:2px; }
  strong { font-weight:600; } ul,ol { margin:0 0 1.15em 1.2em; padding:0; } li { margin-bottom:.4em; }
  code { font-family:'JetBrains Mono',monospace; font-size:.86em;
    background:#eef0ee; padding:1px 5px; border-radius:4px; }
  pre { background:#f2f3f1; border:1px solid #e3e5e2; border-radius:8px;
    padding:14px 16px; overflow-x:auto; } pre code { background:none; padding:0; }
  blockquote { margin:1.4em 0; padding:.2em 1.1em; border-left:3px solid var(--accent);
    color:var(--muted); } table { border-collapse:collapse; width:100%; margin:1.2em 0; }
  th,td { border:1px solid #e3e5e2; padding:8px 12px; text-align:left; }
  .sources a { word-break:break-word; }
  footer { margin-top:3rem; padding-top:1.2rem; border-top:1px solid #e3e5e2;
    font-family:'JetBrains Mono',monospace; font-size:.7rem; color:var(--muted); }
</style></head>
<body><main>
  <div class="meta">${today()} &middot; ${SITE}</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="rule"></div>
  <article>${body}</article>
  ${srcHtml}
  <footer>Generated from ${SITE}</footer>
</main></body></html>`;

  triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${slugify(title)}.html`);
}

// ── Shared inline-token flattening ───────────────────────────────────────────
// marked gives each block token a `tokens` array of inline pieces. We turn those
// into styled runs the PDF and DOCX builders can each render.
interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function inlineRuns(tokens: any[] | undefined, inherit: Partial<Run> = {}): Run[] {
  if (!tokens) return [];
  const runs: Run[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'strong':
        runs.push(...inlineRuns(t.tokens, { ...inherit, bold: true }));
        break;
      case 'em':
        runs.push(...inlineRuns(t.tokens, { ...inherit, italic: true }));
        break;
      case 'codespan':
        runs.push({ ...inherit, text: t.text, code: true });
        break;
      case 'link':
        runs.push(...inlineRuns(t.tokens, { ...inherit, link: t.href }));
        break;
      case 'br':
        runs.push({ text: '\n' });
        break;
      default:
        runs.push({ ...inherit, text: t.text ?? t.raw ?? '' });
    }
  }
  return runs;
}

function itemRuns(item: any): Run[] {
  // A list item's text lives one level down; fall back to raw if needed.
  const inner = item.tokens?.[0]?.tokens ?? item.tokens ?? [];
  const runs = inlineRuns(inner);
  return runs.length ? runs : [{ text: item.text ?? '' }];
}

// ── PDF (pdfmake) ─────────────────────────────────────────────────────────────
export async function downloadPdf(query: string, answerMd: string, sources: ExportSource[]): Promise<void> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake: any = (pdfMakeMod as any).default ?? pdfMakeMod;
  // The vfs_fonts export shape has changed across pdfmake versions: 0.2.x nests
  // it at `.pdfMake.vfs`, mid versions at `.vfs`, and 0.3.x exports the font map
  // directly. Pick whichever candidate actually holds the .ttf font entries.
  const m: any = vfsMod;
  const vfs = [m?.vfs, m?.default?.vfs, m?.pdfMake?.vfs, m?.default?.pdfMake?.vfs, m?.default, m].find(
    c => c && typeof c === 'object' && Object.keys(c).some(k => k.endsWith('.ttf')),
  );
  // 0.3.x replaced the old `pdfMake.vfs = {...}` property with a method that
  // writes each font into its internal virtual file system - the property
  // assignment silently no-ops on this version, so fonts never resolve.
  if (vfs) {
    if (typeof pdfMake.addVirtualFileSystem === 'function') {
      pdfMake.addVirtualFileSystem(vfs);
    } else {
      pdfMake.vfs = vfs;
    }
  }

  const runsToPdf = (runs: Run[]): any[] =>
    runs.map(r => ({
      text: r.text,
      bold: r.bold,
      italics: r.italic,
      ...(r.link ? { link: r.link, color: ACCENT, decoration: 'underline' } : {}),
      ...(r.code ? { font: 'Roboto', background: '#eef0ee', color: '#0b5a37' } : {}),
    }));

  const title = cleanExportTitle(query);
  const kind = detectDocKind(query);
  const content: any[] = [
    { text: `${today()}  ·  ${SITE}`, style: 'meta' },
    { text: title, style: 'title', margin: [0, 6, 0, 10] },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 2.5, lineColor: ACCENT }],
      margin: [0, 0, 0, 18],
    },
  ];

  for (const tok of marked.lexer(answerMd) as any[]) {
    switch (tok.type) {
      case 'heading':
        content.push({
          text: inlineRuns(tok.tokens).map(r => r.text).join(''),
          style: tok.depth <= 2 ? 'h2' : 'h3',
          margin: [0, 14, 0, 6],
        });
        break;
      case 'paragraph':
        content.push({ text: runsToPdf(inlineRuns(tok.tokens)), style: 'para', margin: [0, 0, 0, 9] });
        break;
      case 'list':
        content.push({
          [tok.ordered ? 'ol' : 'ul']: tok.items.map((it: any) => ({ text: runsToPdf(itemRuns(it)) })),
          margin: [4, 0, 0, 10],
          style: 'para',
        });
        break;
      case 'blockquote':
        content.push({
          text: inlineRuns(tok.tokens?.[0]?.tokens).map(r => r.text).join(''),
          style: 'quote',
          margin: [12, 4, 0, 12],
        });
        break;
      case 'code':
        content.push({ text: tok.text, style: 'code', margin: [0, 2, 0, 12] });
        break;
      default:
        break;
    }
  }

  if (sources.length && kind === 'article') {
    content.push({ text: 'Sources', style: 'h2', margin: [0, 18, 0, 6] });
    content.push({
      ol: sources.map(s => ({
        text: [
          { text: `${s.title}  `, bold: true },
          { text: s.url, color: ACCENT, link: s.url },
        ],
      })),
      style: 'para',
      margin: [4, 0, 0, 0],
    });
  }

  const docDefinition = {
    pageMargins: [56, 60, 56, 64],
    content,
    defaultStyle: { fontSize: 10.5, lineHeight: 1.4, color: INK },
    styles: {
      meta: { fontSize: 8.5, color: MUTED, characterSpacing: 0.5 },
      title: { fontSize: 21, bold: true, color: INK },
      h2: { fontSize: 14, bold: true, color: INK },
      h3: { fontSize: 11.5, bold: true, color: INK },
      para: { fontSize: 10.5, color: INK },
      quote: { italics: true, color: MUTED },
      code: { fontSize: 9, color: '#0b5a37', background: '#f2f3f1', preserveLeadingSpaces: true },
    },
    footer: () => ({
      text: `Generated from ${SITE}`,
      alignment: 'center',
      color: MUTED,
      fontSize: 8,
      margin: [0, 12, 0, 0],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`${slugify(title)}.pdf`);
}

// ── DOCX (docx) ───────────────────────────────────────────────────────────────
export async function downloadDocx(query: string, answerMd: string, sources: ExportSource[]): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, ExternalHyperlink, HeadingLevel, AlignmentType } = await import('docx');

  const runsToDocx = (runs: Run[]): any[] =>
    runs.flatMap((r): any[] => {
      if (r.link) {
        return [
          new ExternalHyperlink({
            link: r.link,
            children: [new TextRun({ text: r.text, style: 'Hyperlink', bold: r.bold, italics: r.italic })],
          }),
        ];
      }
      return [
        new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          font: r.code ? 'Consolas' : undefined,
          color: r.code ? '0B5A37' : undefined,
        }),
      ];
    });

  const title = cleanExportTitle(query);
  const kind = detectDocKind(query);
  const children: any[] = [
    new Paragraph({ children: [new TextRun({ text: `${today()}  ·  ${SITE}`, color: '6B7280', size: 17 })] }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 40 })],
      spacing: { after: 120 },
      border: { bottom: { color: '00A65A', size: 18, space: 8, style: 'single' } },
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
  ];

  for (const tok of marked.lexer(answerMd) as any[]) {
    switch (tok.type) {
      case 'heading':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: inlineRuns(tok.tokens).map(r => r.text).join(''), bold: true })],
            heading: tok.depth <= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 80 },
          }),
        );
        break;
      case 'paragraph':
        children.push(new Paragraph({ children: runsToDocx(inlineRuns(tok.tokens)), spacing: { after: 140 } }));
        break;
      case 'list':
        tok.items.forEach((it: any) => {
          children.push(
            new Paragraph({
              children: runsToDocx(itemRuns(it)),
              bullet: tok.ordered ? undefined : { level: 0 },
              numbering: tok.ordered ? { reference: 'ol', level: 0 } : undefined,
              spacing: { after: 60 },
            }),
          );
        });
        break;
      case 'blockquote':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: inlineRuns(tok.tokens?.[0]?.tokens).map(r => r.text).join(''), italics: true, color: '6B7280' })],
            indent: { left: 360 },
            spacing: { after: 140 },
          }),
        );
        break;
      case 'code':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: tok.text, font: 'Consolas', size: 18 })],
            shading: { type: 'clear', fill: 'F2F3F1' },
            spacing: { after: 140 },
          }),
        );
        break;
      default:
        break;
    }
  }

  if (sources.length && kind === 'article') {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Sources', bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      }),
    );
    sources.forEach((s, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${s.title}  `, bold: true }),
            new ExternalHyperlink({ link: s.url, children: [new TextRun({ text: s.url, style: 'Hyperlink' })] }),
          ],
          spacing: { after: 60 },
        }),
      );
    });
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Generated from ${SITE}`, color: '9AA0A6', size: 16 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
  );

  const doc = new Document({
    numbering: {
      config: [{ reference: 'ol', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }] }],
    },
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${slugify(title)}.docx`);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
