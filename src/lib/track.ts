// Shared visitor-tracking client. getVisitorId() is used by both the
// automatic page-view tracker (useVisitTracking.ts) and trackEvent() below,
// so a single persistent ID covers everything one visitor does.

const STORAGE_KEY = 'visitor_id';

export function getVisitorId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

// Fire-and-forget: records a named interaction (a click, a toggle, a
// submitted command/query) against the current visitor, alongside the
// automatic page-view log. `detail` is free text describing what happened
// (e.g. "clicked GitHub", "theme -> dark", "ran: help"). Never throws and
// never blocks the caller - a missing/misconfigured DB just means the event
// is silently dropped, same as page-view tracking.
export function trackEvent(event: string, detail?: string): void {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      path: location.pathname,
      event,
      detail,
    }),
    keepalive: true,
  }).catch(() => {
    // best-effort only
  });
}
