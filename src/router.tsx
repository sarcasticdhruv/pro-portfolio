import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from './App';

// Route-level code splitting: each page ships as its own chunk instead of
// all being bundled into one ~1.8MB entry (Lighthouse's "reduce unused
// JavaScript" flag - visiting "/" was downloading chess.js, marked, and
// every other page's code that a single route never uses). HomePage stays
// eager since it's what almost every visit loads first.
import HomePage from './pages/HomePage';
const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const BlogTagPage = lazy(() => import('./pages/BlogTagPage'));
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
      { path: 'blog', element: withSuspense(<BlogListPage />) },
      { path: 'blogs', element: withSuspense(<BlogListPage />) },
      { path: 'blog/tag/:tag', element: withSuspense(<BlogTagPage />) },
      { path: 'blog/:slug', element: withSuspense(<BlogPostPage />) },
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
