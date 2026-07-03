import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import GamesPage from './pages/GamesPage';
import SearchPage from './pages/SearchPage';
import ImaginePage from './pages/ImaginePage';
import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'blog', element: <BlogListPage /> },
      { path: 'blogs', element: <BlogListPage /> },
      { path: 'blog/:slug', element: <BlogPostPage /> },
      { path: 'games', element: <GamesPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'imagine', element: <ImaginePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default router;
