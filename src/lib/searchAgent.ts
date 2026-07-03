// Multi-agent search pipeline. Up to four agents cooperate per query:
//
//   1. Router        (local, instant)  - classifies the query into a lane
//   2. Site agent    (local, instant)  - retrieves matching site content
//   3. Web agent     (web-tier model)  - real web search, runs in parallel
//   4. Analyst agent (fast-tier model) - drafts key facts/reasoning, parallel
//   5. Synthesizer   (synth-tier)      - merges everything, streams the answer
//
// Worker agents (3+4) run concurrently; the synthesizer only starts once
// both settle. Any worker may fail without killing the search - the
// synthesizer works with whatever material survived.
import { searchContent, type ScoredMatch } from './contentIndex';
import { streamChat, chat, hasAnyProvider, hasWebSearch } from './providers';
import { fetchWebRefs, hasImageIntent, type WebRefs, type WebImage } from './webTools';
import { detectDocIntent, detectDocKind, hasImageGenIntent, extractTopic } from './exportAnswer';

export type Lane = 'site' | 'web' | 'both';

export interface AgentStep {
  id: string;
  label: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
}

export interface SearchSource {
  title: string;
  url: string;
  kind: string;
  snippet: string;
}

export interface SearchResult {
  query: string;
  lane: Lane;
  sources: SearchSource[];
  images?: WebImage[];
  answer: string;
  agentsUsed?: number;
  degraded?: boolean; // AI unavailable - local sources only
  fromCache?: boolean;
}

export interface SearchHandlers {
  onSteps: (steps: AgentStep[]) => void;
  onToken: (fullTextSoFar: string) => void;
}

// Unambiguous signals: names, handles, his projects, this site
const STRONG_SITE_RE = new RegExp(
  [
    'dhruv', 'choudhary', 'sarcasticdhruv', 'portfolio', 'this site', 'your resume',
    'cgpa', 'mits', 'gwalior', 'lifebot', 'kisaan', 'boardbrief', 'board brief',
    'fire notes', 'helix',
  ].join('|'),
  'i',
);

// Topic words that only mean "about Dhruv" when paired with a person
// reference - "should a startup hire contractors" is a general question,
// "would you be open to hire" is not.
const TOPIC_RE = /resume|cv\b|hire|hiring|contact|experience|intern|skill|project|blog|achievement|certification|education|research|paper/i;
const PERSON_RE = /\byou\b|\byour\b|\bhis\b|\bhe\b|\bhim\b|\byourself\b/i;

const STRONG_LOCAL_SCORE = 8;

export function classify(query: string, localTop: ScoredMatch | undefined): Lane {
  const siteSignal = STRONG_SITE_RE.test(query) || (TOPIC_RE.test(query) && PERSON_RE.test(query));
  const strongLocal = (localTop?.score ?? 0) >= STRONG_LOCAL_SCORE;
  if (siteSignal) return 'site';
  if (strongLocal) return 'both';
  return 'web';
}

const VOICE =
  'Write in a plain, direct, measured tone. Short declarative sentences. No em-dashes, no emojis, no marketing fluff. Never mention which AI model, agent or provider produced anything.';

function siteContext(matches: ScoredMatch[]): string {
  return matches
    .map((m, i) => `[${i + 1}] ${m.record.title}\n${m.record.text}`)
    .join('\n\n');
}

export async function runSearch(query: string, handlers: SearchHandlers): Promise<SearchResult> {
  // If the query asks for the answer AS a document ("make a pdf of the eiffel
  // tower") or as a generated image ("make an image of a swan"), search the
  // underlying topic so the model answers about the subject instead of
  // explaining how to make a file/image. The original query is kept as
  // result.query for display, the format callout, and the document title.
  const effectiveQuery =
    detectDocIntent(query) || hasImageGenIntent(query) ? extractTopic(query) : query;
  // When exporting as a document, shape the answer itself like the real
  // thing (a resume, a project brief, actual code) instead of a generic
  // researched answer that then gets wrapped in a document template.
  const docKind = detectDocIntent(query) ? detectDocKind(query) : null;

  const steps: AgentStep[] = [];
  const emit = () => handlers.onSteps([...steps]);
  const startStep = (id: string, label: string) => {
    steps.push({ id, label, status: 'running' });
    emit();
  };
  const endStep = (id: string, detail?: string, status: 'done' | 'error' = 'done') => {
    const s = steps.find(st => st.id === id);
    if (s) {
      s.status = status;
      s.detail = detail;
    }
    emit();
  };

  // ── Agent 1: router (local, instant) ──────────────────────────────────────
  startStep('classify', 'Understanding query');
  const matches = searchContent(effectiveQuery, 6);
  const lane = classify(effectiveQuery, matches[0]);
  endStep(
    'classify',
    lane === 'site' ? 'about Dhruv / this site' : lane === 'web' ? 'general question' : 'mixed',
  );

  // A pure "generate an image of X" request doesn't need site/web retrieval,
  // an analyst pass or a full synthesized essay - the answer image panel
  // already renders in parallel with this step. Short-circuit straight to a
  // caption so the pipeline finishes fast and the visible steps accurately
  // reflect what's happening (no LLM call needed at all).
  if (hasImageGenIntent(query)) {
    startStep('image', 'Generating image');
    endStep('image', `rendering "${effectiveQuery}"`);
    const result: SearchResult = {
      query, lane, sources: [],
      answer: `Here's your generated image of **${effectiveQuery}**.`,
      agentsUsed: 2,
    };
    handlers.onToken(result.answer);
    return result;
  }

  // ── Agent 2: site retrieval (local, instant) ──────────────────────────────
  // Unless the query is explicitly about Dhruv/the site, only genuinely
  // relevant site content makes it into the sources/answer - weak keyword
  // overlap is noise.
  const relevant = lane === 'site' ? matches : matches.filter(m => m.score >= STRONG_LOCAL_SCORE);
  startStep('site', 'Searching portfolio');
  const sources: SearchSource[] = relevant.map(m => ({
    title: m.record.title,
    url: m.record.url,
    kind: m.record.kind,
    snippet: m.snippet,
  }));
  endStep('site', `${sources.length} match${sources.length === 1 ? '' : 'es'}`);

  const result: SearchResult = { query, lane, sources, answer: '' };

  if (!hasAnyProvider()) {
    result.degraded = true;
    return result;
  }

  // ── Agents 3 + 4: web search + analyst, in parallel ──────────────────────
  const runWeb = lane !== 'site' && hasWebSearch();
  let agentsUsed = 2;

  const webTask: Promise<string | null> = (async () => {
    if (!runWeb) return null;
    agentsUsed++;
    startStep('web', 'Searching the web');
    try {
      const text = await chat({
        tier: 'web',
        maxTokens: 600,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are a web research agent. Search the web and report the most relevant, current facts for the query as tight bullet points with concrete details (names, numbers, dates). No preamble, no conclusions.',
          },
          { role: 'user', content: effectiveQuery },
        ],
      });
      endStep('web', 'findings collected');
      return text;
    } catch {
      endStep('web', 'unavailable, skipped', 'error');
      return null;
    }
  })();

  const imageIntent = hasImageIntent(effectiveQuery);

  // References agent: Openverse + Wikipedia + DuckDuckGo + HN (free, keyless)
  const refsTask: Promise<WebRefs | null> = (async () => {
    if (lane === 'site') return null;
    agentsUsed++;
    startStep('refs', 'Gathering references');
    try {
      const refs = await fetchWebRefs(effectiveQuery, { imageCount: imageIntent ? 9 : 6 });
      endStep(
        'refs',
        `${refs.snippets.length} snippet${refs.snippets.length === 1 ? '' : 's'} · ${refs.images.length} image${refs.images.length === 1 ? '' : 's'}`,
      );
      return refs;
    } catch {
      endStep('refs', 'unavailable, skipped', 'error');
      return null;
    }
  })();

  const analystTask: Promise<string | null> = (async () => {
    agentsUsed++;
    startStep('analyst', 'Analyzing');
    try {
      const ctx = relevant.length > 0 ? `\n\nSite context that may help:\n${siteContext(relevant)}` : '';
      const text = await chat({
        tier: 'fast',
        maxTokens: 450,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are an analyst agent. Draft the key facts, angles and reasoning needed to answer the query well, as tight bullet points. Flag anything uncertain. No preamble.' + ctx,
          },
          { role: 'user', content: effectiveQuery },
        ],
      });
      endStep('analyst', 'notes ready');
      return text;
    } catch {
      endStep('analyst', 'skipped', 'error');
      return null;
    }
  })();

  const [webFindings, refs, analystNotes] = await Promise.all([webTask, refsTask, analystTask]);

  if (refs) {
    result.images = refs.images;
    for (const s of refs.snippets.slice(0, 3)) {
      result.sources.push({
        title: s.title,
        url: s.url,
        kind: 'web',
        snippet: s.text.slice(0, 220),
      });
    }
  }

  // ── Agent 5: synthesizer (streams the final answer) ───────────────────────
  agentsUsed++;
  startStep('synth', 'Synthesizing answer');

  const materials: string[] = [];
  if (relevant.length > 0) {
    materials.push(
      `SITE CONTENT (cite these inline with bracket numbers like [1]):\n${siteContext(relevant)}`,
    );
  }
  if (webFindings) materials.push(`WEB RESEARCH FINDINGS (primary - from a live web search):\n${webFindings}`);
  // Encyclopedic references only make the cut when they clearly overlap the
  // query - tangential snippets dilute the synthesis and hurt answer quality.
  const queryTokens = effectiveQuery.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  const usefulRefs = (refs?.snippets ?? []).filter(s => {
    if (s.text.startsWith('Hacker News discussion')) return false; // titles only, no substance
    const hay = `${s.title} ${s.text}`.toLowerCase();
    return queryTokens.some(t => hay.includes(t)) && s.text.length > 80;
  });
  if (usefulRefs.length > 0) {
    materials.push(
      `BACKGROUND REFERENCES (secondary - ignore any that are not directly relevant):\n${usefulRefs.map(s => `- ${s.title}: ${s.text}`).join('\n')}`,
    );
  }
  if (analystNotes) materials.push(`ANALYST NOTES (advisory):\n${analystNotes}`);

  const imageNote =
    imageIntent && (result.images?.length ?? 0) > 0
      ? ` The interface is already displaying ${result.images!.length} relevant images above your answer - never say you cannot show images, and do not describe or guess what the images contain (you cannot see them). Give a short, informative answer about the subject itself.`
      : '';

  const citeRule = docKind && docKind !== 'article'
    ? 'Do not use bracket citations, footnotes or any other citation markers - just write the content directly.'
    : relevant.length > 0
      ? 'Cite SITE CONTENT items inline with bracket numbers like [1]. That is the only citation format allowed - never emit any other marker (no 【】, no [WEB], no footnotes).'
      : 'Do not use bracket citations or any citation markers at all - just state the facts.';

  const docKindNote =
    docKind === 'resume'
      ? ' The visitor wants this exported as a resume/CV document: structure it as a real resume using the site content below - a one-line headline, then Experience (role, company, dates, terse bullet highlights), then Projects, then Skills, then Education. Use clipped resume bullet fragments, not narrated sentences. Start directly with the content - never a preamble like "Here is a summary" or "Sure, here is the resume:".'
    : docKind === 'project'
      ? ' The visitor wants this exported as a project brief/README: structure it as a one-line description, then Problem, What it does, Tech stack, Key features, Outcome - based on the site content for that specific project. Start directly with the content, no preamble.'
    : docKind === 'code'
      ? ' The visitor wants actual working code, not an explanation. Give the real code in a single fenced code block with the correct language tag, then at most 2-3 lines on how to use it. No preamble before the code, no lengthy explanation after.'
      : '';

  const system = `You are the search engine on Dhruv Choudhary's portfolio website. Give the visitor a genuinely better answer than a generic search engine: lead with the direct answer, then the important details.${imageNote}${docKindNote} ${VOICE} ${citeRule}
${lane === 'site' ? 'Answer using ONLY the site content below. If it does not contain the answer, say so plainly instead of inventing anything.' : 'Ground the answer in the material below. Trust WEB RESEARCH FINDINGS first for anything current. Ignore any material that is not directly relevant to the query - do not let background references water down the answer. Note real uncertainty honestly, but do not hedge when the findings are clear.'}

${materials.join('\n\n---\n\n')}`;

  let streamed = '';
  try {
    const res = await streamChat({
      tier: 'synth',
      maxTokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: effectiveQuery },
      ],
      onAttempt: () => {
        // A retry on the next provider restarts the answer
        streamed = '';
        handlers.onToken('');
      },
      onToken: t => {
        streamed += t;
        handlers.onToken(streamed);
      },
    });
    result.answer = res.text;
    endStep('synth', 'done');
  } catch (e) {
    // Last resort: if a worker already produced usable material, show it
    // rather than a dead page
    if (webFindings || analystNotes) {
      result.answer = webFindings || analystNotes || '';
      handlers.onToken(result.answer);
      endStep('synth', 'fallback to research notes', 'error');
    } else {
      result.degraded = true;
      endStep('synth', e instanceof Error ? e.message : 'AI unavailable', 'error');
    }
  }

  result.agentsUsed = agentsUsed;
  return result;
}
