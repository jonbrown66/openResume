import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import type { AppLanguage, AppTheme, TranslationSet, ResumeTemplate } from '@/config/ui';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateProvider: (id: ApiProviderId, updates: Partial<AppSettings['providers'][keyof AppSettings['providers']]>) => void;
  setActiveProvider: (activeProvider: AppSettings['activeProvider']) => void;
  
  lang: AppLanguage;
  theme: AppTheme;
  translations: TranslationSet;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  
  resumeTheme: ResumeThemeConfig;
  updateResumeTheme: (newConfig: Partial<ResumeThemeConfig>) => void;
  resetResumeTheme: () => void;
  updateCustomCss: (css: string) => void;
  
  template: ResumeTemplate;
  setTemplate: (template: ResumeTemplate) => void;
  
  draft: ResumeDraft;
  setDraft: (draft: ResumeDraft) => void;
  
  isImporting: boolean;
  importError: string;
  importNotice: '' | 'missing-api-key' | 'missing-model' | 'ai-format-fallback';
  importNoticeDetail: string;
  triggerImport: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
  value: AppContextValue;
}

export function AppProvider({ children, value }: AppProviderProps) {
  const memoizedValue = useMemo(() => value, [
    value.settings,
    value.lang,
    value.theme,
    value.resumeTheme,
    value.template,
    value.draft,
    value.isImporting,
    value.importError,
    value.importNotice,
    value.importNoticeDetail,
  ]);
  
  return (
    <AppContext.Provider value={memoizedValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
