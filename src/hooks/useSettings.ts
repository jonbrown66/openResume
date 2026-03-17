import { useEffect, useState } from 'react';
import { type AppSettings, DEFAULT_SETTINGS } from '../config/settings';

const SETTINGS_KEY = 'myresume-settings-v1';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateProvider = (providerId: string, updates: Partial<AppSettings['providers'][keyof AppSettings['providers']]>) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [providerId]: {
          ...prev.providers[providerId as keyof AppSettings['providers']],
          ...updates,
        },
      },
    }));
  };

  const setActiveProvider = (activeProvider: AppSettings['activeProvider']) => {
    setSettings(prev => ({ ...prev, activeProvider }));
  };

  return {
    settings,
    updateProvider,
    setActiveProvider,
  };
}
