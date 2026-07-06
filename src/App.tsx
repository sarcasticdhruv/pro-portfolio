import './index.css';
import { Outlet } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { useVisitTracking } from './hooks/useVisitTracking';
import ThemeTransition from './animations/ThemeTransition';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIChatbot from './components/AIChatbot';

export default function App() {
  const { theme, toggleTheme, transition } = useTheme();
  useVisitTracking();

  return (
    <>
      <ThemeTransition transition={transition} />
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <Outlet />
      <Footer />
      <AIChatbot />
    </>
  );
}
