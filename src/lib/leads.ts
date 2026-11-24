// Client side of the admin "Inbox": captures people who want to reach Dhruv
// from the chatbot (typed chat, the inline contact form, and live voice calls)
// and saves them through /api/leads.
//
// One chat session = one lead row: every save for the session reuses the same
// clientId, and the server merges new details into the existing row.
import { chat } from './providers';
import { getVisitorId } from './track';

export type LeadSource = 'form' | 'chat' | 'voice' | 'email-draft';

export interface LeadDetails {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  intent?: string;
  message?: string;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// 7+ digits, allowing +, spaces, dashes, dots, parentheses between them
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/;
// Spoken emails in voice transcripts: "priya at acme dot com"
const SPOKEN_EMAIL_RE = /\b[a-z0-9._-]+\s+(?:at|@)\s+[a-z0-9-]+\s+(?:dot|\.)\s+[a-z]{2,}\b/i;

export function findContactInfo(text: string): { email?: string; phone?: string } {
  const email = text.match(EMAIL_RE)?.[0];
  const phoneRaw = text.match(PHONE_RE)?.[0];
  const phone = phoneRaw && phoneRaw.replace(/\D/g, '').length >= 7 && phoneRaw.replace(/\D/g, '').length <= 15
    ? phoneRaw.trim()
    : undefined;
  return { email, phone };
}

export function hasContactSignal(text: string): boolean {
  const { email, phone } = findContactInfo(text);
  return !!(email || phone || SPOKEN_EMAIL_RE.test(text));
}

// Intent phrases that mean "this person wants to reach Dhruv", even before
// they share any contact details.
const INTENT_RE = /\b(hire|hiring|recruit|job|role|position|opening|freelance|contract|collab(orate|oration)?|work (with|together)|partner(ship)?|consult(ing)?|project for|get in touch|reach (out|you)|contact (you|me)|talk to (you|dhruv)|call (me|you)|schedule|meeting|interview|quote|proposal)\b/i;

export function hasContactIntent(text: string): boolean {
  return INTENT_RE.test(text);
}

let sessionClientId: string | null = null;
export function newLeadSession(): void {
  sessionClientId = null;
}
function clientId(): string {
  if (!sessionClientId) sessionClientId = crypto.randomUUID();
  return sessionClientId;
}

export async function saveLead(
  source: LeadSource,
  details: LeadDetails,
  transcript?: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientId(),
        visitorId: (() => { try { return getVisitorId(); } catch { return undefined; } })(),
        source,
        page: location.pathname,
        ...details,
        transcript,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const EXTRACT_PROMPT = `Extract contact details of the VISITOR (not Dhruv) from this chat transcript between a visitor and Dhruv. Spoken emails like "priya at acme dot com" become "priya@acme.com". Return ONLY JSON:
{"name":string|null,"email":string|null,"phone":string|null,"company":string|null,"intent":"hire"|"freelance"|"collaboration"|"question"|"networking"|"other"|null,"message":string|null}
"message" = one or two sentences summarizing what they want from Dhruv, written in third person ("Wants to hire Dhruv for a RAG project starting January"). Use null for anything not stated. Never invent details.`;

// LLM extraction over the transcript, with a regex fallback so a provider
// outage never loses the email/phone the visitor actually typed.
export async function extractLead(transcript: string): Promise<LeadDetails> {
  const fallback = findContactInfo(transcript.split('\n').filter(l => l.startsWith('Visitor:')).join('\n'));
  try {
    const raw = await Promise.race([
      chat({
        tier: 'chat',
        maxTokens: 500,
        temperature: 0,
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: transcript.slice(-6000) },
        ],
      }),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
    const data = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const pick = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim() : undefined);
    return {
      name: pick(data.name),
      email: pick(data.email) ?? fallback.email,
      phone: pick(data.phone) ?? fallback.phone,
      company: pick(data.company),
      intent: pick(data.intent),
      message: pick(data.message),
    };
  } catch {
    return fallback;
  }
}

export function buildTranscript(turns: { role: 'user' | 'assistant'; content: string }[]): string {
  return turns
    .filter(t => t.content.trim())
    .map(t => `${t.role === 'user' ? 'Visitor' : 'Dhruv'}: ${t.content.trim()}`)
    .join('\n');
}
