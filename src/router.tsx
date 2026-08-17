import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from './App';

// Route-level code splitting: each page ships as its own chunk instead of
// all being bundled into one ~1.8MB entry (Lighthouse's "reduce unused
// JavaScript" flag - visiting "/" was downloading chess.js, marked, and
// every other page's code that a single route never uses).
//
// HomePage and the blog pages stay eager (not lazy). scripts/prerender.mjs
// generates real static HTML for these specifically (post body, tag lists,
// FAQ/JSON-LD) for SEO and non-JS crawlers, but src/main.tsx uses
// createRoot(), not hydrateRoot() - React wipes that prerendered markup
// immediately on mount regardless of Suspense. Lazy-loading these routes
// stacked a *second* delay on top (waiting for the chunk to download before
// anything replaces the wiped DOM), which measured as a real blank-page gap
// of several seconds under throttled conditions, then a 0.11+ CLS jump once
// content finally landed. Secondary pages below (games/search/imagine/
// watched/admin) have no prerendered content to lose, so lazy-loading them
// is a clean win with no such tradeoff.
import HomePage from './pages/HomePage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import BlogTagPage from './pages/BlogTagPage';
const GamesPage = lazy(() => import('./pages/GamesPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ImaginePage = lazy(() => import('./pages/ImaginePage'));
const WatchedPage = lazy(() => import('./pages/WatchedPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Minimal, theme-aware fallback - just enough to avoid a blank flash while
// a route chunk downloads. Most routes resolve fast enough that this never
// becomes visible on a warm cache.
function RouteFallback() {
  return <div style={{ minHeight: '60vh' }} />;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'blog', element: <BlogListPage /> },
      { path: 'blogs', element: <BlogListPage /> },
      { path: 'blog/tag/:tag', element: <BlogTagPage /> },
      { path: 'blog/:slug', element: <BlogPostPage /> },
      { path: 'games', element: withSuspense(<GamesPage />) },
      { path: 'search', element: withSuspense(<SearchPage />) },
      { path: 'imagine', element: withSuspense(<ImaginePage />) },
      { path: 'watched', element: withSuspense(<WatchedPage />) },
      { path: 'admin', element: withSuspense(<AdminPage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]);

export default router;
