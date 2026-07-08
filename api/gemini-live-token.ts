// Vercel Edge Function: mints a short-lived, single-use Gemini Live API
// token for the chatbot's real-time voice call feature.
//
// GEMINI_API_KEY itself never reaches the browser. Instead the client gets
// this ephemeral token back, locked via `liveConnectConstraints` to our exact
// model, audio-only response mode, and Dhruv persona - so even read out of
// devtools it can only be used to have one voice call as "Ask Dhruv", not
// repointed at a different model or prompt. Verified live end-to-end
// (mint -> browser-style token-only connect -> real audio in/out) against
// the real API before wiring this up.
//
// Uses the SDK's `/web` build explicitly (fetch-based, no Node core deps)
// so it runs the same way here in the edge runtime as it does in the
// browser - the default `@google/genai` entry point resolves differently
// per-bundler and could otherwise pull in the Node build's `ws`/
// `google-auth-library` deps, which don't exist in this runtime.

export const config = { runtime: 'edge' };

const ENV: Record<string, string | undefined> =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) ?? {};

function geminiKeys(): string[] {
  return ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4']
    .map(n => ENV[n])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim());
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// Native-audio conversational model - verified live: connects, transcribes
// speech both ways, and replies with real synthesized audio on the free tier.
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

const VOICE_SYSTEM_PROMPT = `You are Dhruv Choudhary, talking live by voice through your own portfolio website. You ARE Dhruv, speaking in first person - not an assistant describing him.

Voice call rules: keep replies short and conversational, one or two sentences, like an actual phone call. No markdown, no lists, no headings, no reading out symbols or asterisks - just natural spoken sentences. If you don't know something, say so plainly, don't invent facts about yourself or your work.

Identity: AI Engineer (GenAI Solutions) at AI LifeBOT, Raipur. B.Tech IT (IoT) at MITS Gwalior, graduating May 2026, CGPA 8.94, department rank 2.

Current work: built a warehouse automation platform with an AI defective-returns classifier for Franke Faber, an NLP quotation engine for a steel distributor (Bajrang Ispat / Goel Pipes), a 10+ language voice-first farming platform (KISAAN KIOSK) shown to the Madhya Pradesh government and Gujarat CM, a law-enforcement intelligence platform for Telangana Police, a RAG knowledge system for Chhattisgarh Medical Services Corporation, and a real-time face recognition receptionist (MIRA) matching 18 faces at once against a 10,000-face database.

Flagship project: Helix Framework, a production-grade AI agent framework on PyPI (pip install helix-framework) - like CrewAI or LangGraph but with hard budget limits, semantic caching, persistent memory and multi-agent teams built in.

Stack: Python first, comfortable in C/C++ and TypeScript, PyTorch, RAG, agentic AI, AWS/GCP, React.

Contact: reach Dhruv by email at nrdhruv654@gmail.com or on GitHub at github.com/sarcasticdhruv.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const keys = geminiKeys();
  if (!keys.length) return json({ error: 'live voice not configured' }, 503);

  const { GoogleGenAI, Modality } = await import('@google/genai/web');
  const now = Date.now();

  // Rotate across every configured key - a rate-limited or exhausted key
  // falls through to the next instead of failing the whole call, same
  // pattern as the other multi-key providers in /api/llm and /api/transcribe.
  let lastError = 'token mint failed';
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1alpha' } });
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          // Window to actually connect and talk once the session is live.
          expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
          // Window to *start* that session - kept short since the browser
          // uses this within seconds of requesting it.
          newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: LIVE_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: VOICE_SYSTEM_PROMPT,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          },
        },
      });
      if (!token.name) { lastError = 'token mint returned no token'; continue; }
      return json({ token: token.name, model: LIVE_MODEL });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return json({ error: lastError }, 502);
}
