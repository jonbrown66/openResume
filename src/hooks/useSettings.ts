import { useCallback, useEffect, useRef, useState } from 'react';
import { type AppSettings, type ApiProviderId, DEFAULT_SETTINGS } from '../config/settings';

const SETTINGS_KEY = 'myresume-settings-v1';

export function useSettings() {
  const blockedStorage = useRef(false);
  const [storageError, setStorageError] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const providers = { ...DEFAULT_SETTINGS.providers };
        for (const id of Object.keys(providers) as ApiProviderId[]) {
          const raw = parsed?.providers?.[id];
          providers[id] = { ...providers[id],
            apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey : providers[id].apiKey,
            model: typeof raw?.model === 'string' ? raw.model : providers[id].model,
            baseUrl: typeof raw?.baseUrl === 'string' ? raw.baseUrl : providers[id].baseUrl,
          };
        }
        return { providers,
          activeProvider: Object.hasOwn(providers, parsed?.activeProvider) ? parsed.activeProvider : DEFAULT_SETTINGS.activeProvider,
          theme: ['light', 'dark', 'system'].includes(parsed?.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
          language: ['zh', 'en'].includes(parsed?.language) ? parsed.language : DEFAULT_SETTINGS.language,
        };
      } catch {
        // Preserve corrupt settings before replacing them with defaults.
        localStorage.setItem(`${SETTINGS_KEY}-recovery-${Date.now()}`, saved);
      }
    }
    } catch { blockedStorage.current = true; }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : 'en';
    if (blockedStorage.current) { setStorageError(true); return; }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateProvider = useCallback((providerId: ApiProviderId, updates: Partial<AppSettings['providers'][keyof AppSettings['providers']]>) => {
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
  }, []);

  const setActiveProvider = useCallback((activeProvider: AppSettings['activeProvider']) => {
    setSettings(prev => ({ ...prev, activeProvider }));
  }, []);

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
    storageError,
  };
}
