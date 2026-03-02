import { useState, useEffect, useCallback } from 'react';
import type { Theme, ThemeTransitionState } from '../types';

const STORAGE_KEY = 'dhruv_portfolio_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [transition, setTransition] = useState<ThemeTransitionState>({
    isTransitioning: false,
    fromTheme: theme,
    toTheme: theme,
  });

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    setTransition({
      isTransitioning: true,
      fromTheme: theme,
      toTheme: nextTheme,
    });

    // Actual theme switch happens mid-animation (at ~60% = 480ms)
    setTimeout(() => {
      setThemeState(nextTheme);
    }, 480);

    // End transition
    setTimeout(() => {
      setTransition((prev) => ({ ...prev, isTransitioning: false }));
    }, 900);
  }, [theme]);

  return { theme, toggleTheme, transition };
}
