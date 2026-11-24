// Agent layer for the chatbot widget.
//
//   1. Planner  - one fast, non-streamed LLM call that reads the conversation
//                 and returns a JSON list of tool calls (or none).
//   2. Tools    - run in parallel, each with its own timeout. A failed tool
//                 never kills the reply; it is reported to the model instead.
//   3. Answer   - the caller streams the final reply with TOOL RESULTS added
//                 to the system prompt (see AIChatbot.tsx).
//
// The protocol is plain JSON-in-text rather than native function calling, so
// it works the same on every provider in the /api/llm fallback chain.
import { chat, chatWithSources, type WebSource } from './providers';
import { searchContent } from './contentIndex';
import { enhancePrompt } from './imagePrompt';
import type { Movie } from '../pages/WatchedPage';

export type ToolName = 'search_site' | 'web_search' | 'generate_image' | 'get_films' | 'draft_email' | 'contact_form';

export interface ToolCall {
  name: ToolName;
  args: Record<string, string>;
}

export interface AgentStep {
  id: string;
  label: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
}

export interface AgentAction {
  type: 'navigate' | 'open';
  target: string;
  label: string;
}

export interface ToolOutcome {
  context: string;           // what the answering model sees
  sources: WebSource[];      // shown as source links under the reply
  actions: AgentAction[];    // buttons under the reply
  image?: { url: string; prompt: string };
  form?: { name?: string; email?: string; phone?: string; message?: string };
}

const TOOL_NAMES: ToolName[] = ['search_site', 'web_search', 'generate_image', 'get_films', 'draft_email', 'contact_form'];

const PLANNER_PROMPT = `You are the tool planner for the chat widget on Dhruv Choudhary's portfolio site. Decide which tools (if any) must run before the reply is written. You do NOT write the reply.

Tools:
- search_site {"query"}: search Dhruv's own site content (projects, experience, skills, blog posts, achievements). Use for anything about Dhruv, his work, his writing or opinions, unless the answer is basic bio info (name, current job, contact links), which the reply model already knows.
- web_search {"query"}: live Google search. Use for current events, news, prices, versions, releases, anything recent, or facts about the wider world the reply model may not know. Write a precise, self-contained query; when a date matters, use today's date (given below), never an older year.
- generate_image {"prompt"}: create an image. Use ONLY when the user asks to draw, generate, make, create, design or show a picture/image/art/logo/wallpaper. For follow-ups ("make it darker", "now in anime style"), write the full updated prompt combining the previous image prompt with the change.
- get_films {"query"}: Dhruv's real watched-films log with ratings and reviews. Use for questions about movies he watched, liked or recommends.
- contact_form {"name","email","phone","message"}: show an inline contact form so the visitor can send Dhruv their details, which reach him directly. Use whenever the visitor wants to talk to, hire, work with, collaborate with, interview, meet or get back in touch with Dhruv, even if they have not given details yet. Prefill any field the visitor already stated in the conversation (use "" for unknown), and write "message" as a short first-person note from the visitor summarizing what they want. Use it again if they later share new details, so the form updates.
- draft_email {"subject","body"}: prepare an email in the visitor's mail app. Use ONLY when the visitor explicitly asks to email or for an email draft. Never use [placeholders].

Rules:
- Greetings, thanks, small talk and simple questions need no tools: return {"tools":[]}.
- At most 3 tool calls. Combine tools when the question needs several (e.g. "how does Helix compare to LangGraph today" = search_site + web_search).
- Whenever the message names one of Dhruv's own projects (Helix, BoardBrief, Kisaan, Fire Notes, Crime Intel, MIRA) or his blog, include search_site, plus web_search if it also needs outside or current info.
- Resolve pronouns and follow-ups from the conversation so every query stands alone.

Return ONLY JSON, no prose, no code fences: {"tools":[{"name":"...","args":{...}}]}`;

const GREETING_RE = /^(hi+|hey+|hello|yo|sup|thanks?( you)?|thx|ty|ok(ay)?|cool|nice|great|bye|good (morning|evening|night))[\s!.?]*$/i;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

export interface PlannerTurn {
  role: 'user' | 'assistant';
  content: string;
  imagePrompt?: string;
}

// Returns [] on any failure: the chatbot then behaves like a plain chat,
// which is always a safe fallback.
export async function planTools(turns: PlannerTurn[]): Promise<ToolCall[]> {
  // One retry: a transient 429/502 on the planner would otherwise silently
  // turn an agentic turn into a plain chat reply.
  const first = await planOnce(turns);
  return first ?? (await planOnce(turns)) ?? [];
}

async function planOnce(turns: PlannerTurn[]): Promise<ToolCall[] | null> {
  const last = turns[turns.length - 1]?.content.trim() ?? '';
  if (!last || GREETING_RE.test(last)) return [];

  const transcript = turns.slice(-6).map(t => {
    const img = t.imagePrompt ? ` [generated image, prompt: "${t.imagePrompt}"]` : '';
    return `${t.role === 'user' ? 'User' : 'Dhruv'}: ${t.content.slice(0, 600)}${img}`;
  }).join('\n');

  try {
    const raw = await withTimeout(chat({
      tier: 'chat',
      maxTokens: 700, // reasoning models spend some of this thinking
      temperature: 0,
      messages: [
        { role: 'system', content: PLANNER_PROMPT },
        { role: 'user', content: `Today is ${new Date().toDateString()}.\n\nConversation:\n${transcript}\n\nPlan tools for the LAST user message.` },
      ],
    }), 6000);
    return parsePlan(raw);
  } catch {
    return null;
  }
}

// True when a reply is a tool call written as JSON instead of prose.
export function looksLikeToolCall(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('{') && /"(tool|tools|name)"\s*:/.test(t.slice(0, 200));
}

export function parsePlan(raw: string): ToolCall[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return [];
  try {
    const data = JSON.parse(raw.slice(start, end + 1));
    // Accept {"tools":[...]} and the single-call shapes models improvise:
    // {"tool":"x","args":{}} / {"name":"x","args":{}}
    const list: unknown[] = Array.isArray(data?.tools) ? data.tools
      : (data?.tool || data?.name) ? [{ name: data.tool ?? data.name, args: data.args ?? data.arguments ?? {} }]
      : [];
    const calls: ToolCall[] = [];
    for (const item of list) {
      const t = item as { name?: string; args?: Record<string, unknown> };
      if (!t?.name || !TOOL_NAMES.includes(t.name as ToolName)) continue;
      const args: Record<string, string> = {};
      for (const [k, v] of Object.entries(t.args ?? {})) if (typeof v === 'string') args[k] = v.trim();
      calls.push({ name: t.name as ToolName, args });
    }
    // one image per turn is plenty, and never more than 3 calls overall
    const seenImage = calls.findIndex(c => c.name === 'generate_image');
    return calls.filter((c, i) => c.name !== 'generate_image' || i === seenImage).slice(0, 3);
  } catch {
    return [];
  }
}

export const STEP_LABEL: Record<ToolName, string> = {
  contact_form: 'Opening contact form',
  search_site: 'Searching my site',
  web_search: 'Searching the web',
  generate_image: 'Generating image',
  get_films: 'Checking my film log',
  draft_email: 'Drafting email',
};

// ── Tool implementations ─────────────────────────────────────────────────────

async function searchSite(query: string): Promise<ToolOutcome & { detail: string }> {
  const hits = searchContent(query, 4);
  if (hits.length === 0) {
    return { context: `search_site("${query}"): no matching content on the site.`, sources: [], actions: [], detail: 'nothing found' };
  }
  const blocks = hits.map(h => `- ${h.record.title} (${h.record.kind}, ${h.record.url})\n  ${h.record.text.slice(0, 900).replace(/\s+/g, ' ')}`);
  const top = hits[0];
  const actions: AgentAction[] = top.record.url.startsWith('/')
    ? [{ type: 'navigate', target: top.record.url, label: top.record.kind === 'blog' ? 'Read the post' : `Open ${top.record.title}`.slice(0, 28) }]
    : [];
  return {
    context: `search_site("${query}") results (real content from my site):\n${blocks.join('\n')}`,
    sources: [],
    actions,
    detail: `${hits.length} match${hits.length === 1 ? '' : 'es'}`,
  };
}

async function webSearch(query: string): Promise<ToolOutcome & { detail: string }> {
  const { text, sources } = await withTimeout(chatWithSources({
    tier: 'web',
    maxTokens: 500,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a web research agent. Report the most relevant, current facts for the query as tight bullet points with concrete details (names, numbers, dates). No preamble.' },
      { role: 'user', content: query },
    ],
  }), 12000);
  const list = sources.map((s, i) => `[${i + 1}] ${s.title} - ${s.url}`).join('\n');
  return {
    context: `web_search("${query}") findings (live, current):\n${text}${list ? `\nSources:\n${list}` : ''}`,
    sources,
    actions: [],
    detail: `${sources.length} source${sources.length === 1 ? '' : 's'}`,
  };
}

async function generateImage(prompt: string): Promise<ToolOutcome & { detail: string }> {
  const finalPrompt = await enhancePrompt(prompt);
  const res = await withTimeout(fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: finalPrompt }),
  }), 30000);
  if (!res.ok) throw new Error('image models busy');
  const blob = await res.blob();
  // data URL (not an object URL) so it survives in message state and can be
  // downloaded later without lifetime bookkeeping
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
  return {
    context: `generate_image: done. The image is already displayed to the user right above your reply (you cannot see it). Prompt used: "${finalPrompt}". Reply in one or two short sentences in past tense: say you made it (for an edit request, say you applied their change, e.g. "Here it is, darker and stormier."), then offer one concrete tweak they could ask for next. Do not describe details you cannot see.`,
    sources: [],
    actions: [],
    image: { url, prompt },
    detail: 'ready',
  };
}

async function getFilms(query: string, movies: Movie[] | null): Promise<ToolOutcome & { detail: string }> {
  let list = movies;
  if (!list) {
    const r = await withTimeout(fetch('/api/movies'), 5000);
    const data = r.ok ? await r.json() : null;
    list = Array.isArray(data?.movies) ? data.movies : [];
  }
  if (!list || list.length === 0) {
    return { context: 'get_films: the film log is unavailable right now.', sources: [], actions: [], detail: 'unavailable' };
  }
  const lines = list.map(m => {
    const bits = [m.title, m.year ? `(${m.year})` : '', m.director ? `dir. ${m.director}` : ''].filter(Boolean).join(' ');
    const status = m.status === 'watchlist' ? 'on watchlist' : `watched${m.rating ? `, rated ${m.rating}/5` : ''}`;
    return `${bits}: ${status}${m.review ? ` - "${m.review}"` : ''}`;
  });
  return {
    context: `get_films("${query}") - my real film log:\n${lines.join('\n')}`,
    sources: [],
    actions: [{ type: 'navigate', target: '/watched', label: 'See my film log' }],
    detail: `${list.length} films`,
  };
}

function contactForm(args: Record<string, string>): ToolOutcome & { detail: string } {
  const clean = (v?: string) => (v && v.trim() && !/^\[.*\]$/.test(v.trim()) ? v.trim() : undefined);
  const form = { name: clean(args.name), email: clean(args.email), phone: clean(args.phone), message: clean(args.message) };
  const missing = [!form.name && 'name', !form.email && !form.phone && 'email or phone'].filter(Boolean).join(' and ');
  return {
    context: `contact_form: an inline contact form is shown under your reply${form.name || form.email || form.phone ? ', prefilled with what they already told you' : ''}. Submitting it sends their details straight to you (Dhruv). Reply warmly in one or two short sentences: say you'd like to hear more and they can drop their details in the form below${missing ? `, and ask for their ${missing} so you can get back to them (they can also just type it here)` : ''}. Do not repeat their details back as a list.`,
    sources: [],
    actions: [],
    form,
    detail: 'ready',
  };
}

function draftEmail(subject: string, body: string): ToolOutcome & { detail: string } {
  const href = `mailto:nrdhruv654@gmail.com?subject=${encodeURIComponent(subject || 'Hello from your portfolio')}&body=${encodeURIComponent(body)}`;
  return {
    context: `draft_email: a "Send email" button with this draft is shown under your reply.\nSubject: ${subject}\nBody:\n${body}\nYou (Dhruv) wrote this draft on the visitor's behalf; it will be sent TO you. Say so plainly (e.g. "Here's a draft you can send me."), show the subject and body, and tell them to tap Send email to open it in their mail app, tweak it, and send. Keep it warm and short.`,
    sources: [],
    actions: [{ type: 'open', target: href, label: 'Send email' }],
    detail: 'draft ready',
  };
}

// Runs every planned tool in parallel. onStep fires as each one starts and
// settles so the UI can show live progress.
export async function runTools(
  calls: ToolCall[],
  ctx: { movies: Movie[] | null },
  onStep: (steps: AgentStep[]) => void,
): Promise<ToolOutcome> {
  const steps: AgentStep[] = calls.map((c, i) => ({ id: `${c.name}-${i}`, label: STEP_LABEL[c.name], status: 'running' }));
  onStep([...steps]);

  const settle = (i: number, status: AgentStep['status'], detail?: string) => {
    steps[i] = { ...steps[i], status, detail };
    onStep([...steps]);
  };

  const results = await Promise.all(calls.map(async (c, i) => {
    try {
      const q = c.args.query ?? c.args.prompt ?? '';
      const out =
        c.name === 'search_site' ? await searchSite(q) :
        c.name === 'web_search' ? await webSearch(q) :
        c.name === 'generate_image' ? await generateImage(c.args.prompt ?? q) :
        c.name === 'get_films' ? await getFilms(q, ctx.movies) :
        c.name === 'contact_form' ? contactForm(c.args) :
        draftEmail(c.args.subject ?? '', c.args.body ?? '');
      settle(i, 'done', out.detail);
      return out as ToolOutcome;
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'failed';
      settle(i, 'error', reason);
      return {
        context: `${c.name}: FAILED (${reason}). Tell the user briefly that this part did not work and answer as well as you can without it.`,
        sources: [], actions: [],
      } as ToolOutcome;
    }
  }));

  return {
    context: results.map(r => r.context).join('\n\n'),
    sources: results.flatMap(r => r.sources),
    actions: results.flatMap(r => r.actions),
    image: results.find(r => r.image)?.image,
    form: results.find(r => r.form)?.form,
  };
}
