import { useState, useEffect, useCallback } from 'react';
import type { ResumeThemeConfig } from '../types/theme';
import { DEFAULT_THEME_CONFIG } from '../types/theme';

const THEME_STORAGE_KEY = 'resume_theme_config_v1';

export function useResumeTheme() {
  const [theme, setTheme] = useState<ResumeThemeConfig>(DEFAULT_THEME_CONFIG);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        const parsedTheme = JSON.parse(storedTheme);
        setTheme({ ...DEFAULT_THEME_CONFIG, ...parsedTheme });
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage', error);
    }
  }, []);

  const updateTheme = useCallback((newConfig: Partial<ResumeThemeConfig>) => {
    setTheme(prevTheme => {
      const updatedTheme = { ...prevTheme, ...newConfig };
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updatedTheme));
      } catch (error) {
        console.error('Failed to save theme to localStorage', error);
      }
      return updatedTheme;
    });
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME_CONFIG);
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove theme from localStorage', error);
    }
  }, []);

  const updateCustomCss = useCallback((css: string) => {
    updateTheme({ customCss: css });
  }, [updateTheme]);

  return { theme, updateTheme, resetTheme, updateCustomCss };
}
