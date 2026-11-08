import { useEffect, useState, useMemo } from 'react';
import type { AppTheme } from '../config/ui';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useAppTheme(theme: AppTheme) {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = useMemo(() => (theme === 'system' ? systemTheme : theme), [theme, systemTheme]);

  // Sync theme to document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    // Suppress transitions while the colors change, then flush the new values
    // so removing the guard cannot start a fade on every surface at once.
    root.classList.add('theme-switching');
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    void getComputedStyle(root).backgroundColor;
    root.classList.remove('theme-switching');
  }, [resolvedTheme]);

  return { resolvedTheme, systemTheme };
}
