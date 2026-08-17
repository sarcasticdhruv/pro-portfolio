import { lazy } from 'react';

// Registry of embeddable interactive widgets, keyed by the slug used in
// markdown as {{widget:slug}}. Add new entries here as new widgets ship.
export const WIDGETS: Record<string, ReturnType<typeof lazy>> = {
  'containment-check': lazy(() => import('./ContainmentCheck')),
};
