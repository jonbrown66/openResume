import { useEffect, useState } from 'react';
import { type AppSettings, type ApiProviderId, DEFAULT_SETTINGS } from '../config/settings';

const SETTINGS_KEY = 'myresume-settings-v1';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          providers: {
            ...DEFAULT_SETTINGS.providers,
            ...(parsed.providers || {}),
          },
        };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updateProvider = (providerId: ApiProviderId, updates: Partial<AppSettings['providers'][keyof AppSettings['providers']]>) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [providerId]: {
          ...prev.providers[providerId],
          ...updates,
        },
      },
    }));
  };

  const setActiveProvider = (activeProvider: AppSettings['activeProvider']) => {
    setSettings(prev => ({ ...prev, activeProvider }));
  };

  const setTheme = (theme: AppSettings['theme']) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const setLanguage = (language: AppSettings['language']) => {
    setSettings(prev => ({ ...prev, language }));
  };

  return {
    settings,
    updateSettings,
    updateProvider,
    setActiveProvider,
    setTheme,
    setLanguage,
  };
}
