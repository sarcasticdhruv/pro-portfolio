import { useState, useEffect, useCallback } from 'react';
import type { Theme, ThemeTransitionState } from '../types';

const STORAGE_KEY = 'dhruv_portfolio_theme';
// Set once the visitor manually toggles. While unset, we follow the OS theme
// (defaulting to light) so the site starts light unless the system is dark.
const MANUAL_KEY = 'dhruv_portfolio_theme_manual';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const manual = localStorage.getItem(MANUAL_KEY) === '1';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (manual && (saved === 'dark' || saved === 'light')) return saved;
    return systemTheme();
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

  // Follow the OS theme live — but only until the visitor picks one manually.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(MANUAL_KEY) === '1') return;
      setThemeState(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    // A manual toggle pins the choice and stops OS-following.
    localStorage.setItem(MANUAL_KEY, '1');

    setTransition({
      isTransitioning: true,
      fromTheme: theme,
      toTheme: nextTheme,
      origin,
    });

    // Swap the real theme once the wipe has covered the screen, so the
    // switch is hidden under the cover. Must stay in sync with the timings
    // in ThemeTransition.tsx (SWAP_MS / END_MS).
    setTimeout(() => {
      setThemeState(nextTheme);
    }, 600);

    // End transition once the meteor impact + debris have finished playing.
    setTimeout(() => {
      setTransition((prev) => ({ ...prev, isTransitioning: false }));
    }, 1040);
  }, [theme]);

  return { theme, toggleTheme, transition };
}
