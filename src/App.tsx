import './index.css';
import { Outlet } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { useVisitTracking } from './hooks/useVisitTracking';
import { trackEvent } from './lib/track';
import ThemeTransition from './animations/ThemeTransition';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIChatbot from './components/AIChatbot';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const { theme, toggleTheme, transition } = useTheme();
  useVisitTracking();

  const handleToggleTheme = (origin?: { x: number; y: number }) => {
    trackEvent('toggle_theme', `-> ${theme === 'dark' ? 'light' : 'dark'}`);
    toggleTheme(origin);
  };

  return (
    <>
      <ThemeTransition transition={transition} />
      <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
      <Outlet />
      <Footer />
      <AIChatbot />
      <ScrollToTop />
    </>
  );
}
