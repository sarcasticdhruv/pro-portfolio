// Device-wise Imagine history in localStorage, mirroring searchHistory.ts.
// Doubles as a result cache so reopening (or retyping) a prompt never
// re-generates. Images are much bigger than search's cached text, so this
// keeps a smaller entry cap and stores the actual pixels as a base64 data
// URL (an object URL from URL.createObjectURL wouldn't survive a reload -
// those are only valid for the page session that created them).
const KEY = 'dc_imagine_history_v1';
const MAX_ENTRIES = 8;

export interface ImagineHistoryEntry {
  id: string;
  createdAt: number;
  prompt: string;
  source: string;
  dataUrl: string;
}

export function loadHistory(): ImagineHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: ImagineHistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded (images add up fast) - drop oldest half and retry once
    try {
      localStorage.setItem(KEY, JSON.stringify(entries.slice(0, Math.ceil(entries.length / 2))));
    } catch {
      // Storage unavailable - history just won't persist
    }
  }
}

export function saveToHistory(entry: { prompt: string; source: string; dataUrl: string }): ImagineHistoryEntry[] {
  const full: ImagineHistoryEntry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  // Replace any older entry for the same prompt (case-insensitive)
  const rest = loadHistory().filter(
    e => e.prompt.trim().toLowerCase() !== entry.prompt.trim().toLowerCase(),
  );
  const next = [full, ...rest].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

export function findCached(prompt: string): ImagineHistoryEntry | undefined {
  const p = prompt.trim().toLowerCase();
  return loadHistory().find(e => e.prompt.trim().toLowerCase() === p);
}

export function removeFromHistory(id: string): ImagineHistoryEntry[] {
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
