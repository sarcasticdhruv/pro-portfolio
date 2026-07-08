import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getVisitorId } from '../lib/track';

// Fires a best-effort POST to /api/track on every route change, carrying a
// visitor ID that persists across visits (localStorage) so the admin
// dashboard can tell "same person, N visits" apart from new visitors. Never
// blocks rendering and never surfaces errors - if the tracking DB isn't
// configured yet, the endpoint just no-ops.
export function useVisitTracking(): void {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        path: location.pathname,
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {
      // best-effort only
    });
  }, [location.pathname]);
}
