// Device-wise search history in localStorage. Doubles as a result cache so
// reopening an entry never re-calls the API. Deliberately small: 20 entries,
// answers trimmed to ~6KB (worst case ~120KB total).
import type { SearchResult } from './searchAgent';

const KEY = 'dc_search_history_v1';
const MAX_ENTRIES = 20;
const MAX_ANSWER_CHARS = 6000;

export interface HistoryEntry extends SearchResult {
  id: string;
  createdAt: number;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded — drop oldest half and retry once
    try {
      localStorage.setItem(KEY, JSON.stringify(entries.slice(0, Math.ceil(entries.length / 2))));
    } catch {
      // Storage unavailable - history just won't persist
    }
  }
}

export function saveToHistory(result: SearchResult): HistoryEntry[] {
  const entry: HistoryEntry = {
    ...result,
    answer: result.answer.slice(0, MAX_ANSWER_CHARS),
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  // Replace any older entry for the same query (case-insensitive)
  const rest = loadHistory().filter(
    e => e.query.trim().toLowerCase() !== result.query.trim().toLowerCase(),
  );
  const next = [entry, ...rest].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

export function findCached(query: string): HistoryEntry | undefined {
  const q = query.trim().toLowerCase();
  return loadHistory().find(e => e.query.trim().toLowerCase() === q && e.answer);
}

export function removeFromHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter(e => e.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
