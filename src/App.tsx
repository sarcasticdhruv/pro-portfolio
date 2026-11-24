import './index.css';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { useVisitTracking } from './hooks/useVisitTracking';
import { trackEvent } from './lib/track';
import ThemeTransition from './animations/ThemeTransition';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIChatbot from './components/AIChatbot';
import ScrollToTop from './components/ScrollToTop';
import GridBackdrop from './components/GridBackdrop';

export default function App() {
  const { theme, toggleTheme, transition } = useTheme();
  useVisitTracking();

  // Blog pages get a paper texture background (see .paper-bg in index.css).
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.classList.toggle('paper-bg', pathname === '/blog' || pathname.startsWith('/blog/'));
  }, [pathname]);

  const handleToggleTheme = (origin?: { x: number; y: number }) => {
    trackEvent('toggle_theme', `-> ${theme === 'dark' ? 'light' : 'dark'}`);
    toggleTheme(origin);
  };

  return (
    <>
      <ThemeTransition transition={transition} />
      <GridBackdrop />
      <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
      <Outlet />
      <Footer />
      <AIChatbot />
      <ScrollToTop />
    </>
  );
}
