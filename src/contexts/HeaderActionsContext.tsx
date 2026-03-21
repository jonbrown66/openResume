import { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';
import type { ResumeTemplate } from '@/config/ui';

interface HeaderActionsContextValue {
  onImportClick: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  onTemplateChange: (template: ResumeTemplate) => void;
  onThemeChange: (newConfig: Partial<ResumeThemeConfig>) => void;
  onThemeReset: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onOpenStylePanel: () => void;
  onCloseStylePanel: () => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null);

interface HeaderActionsProviderProps {
  children: ReactNode;
  onImportClick: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  onTemplateChange: (template: ResumeTemplate) => void;
  onThemeChange: (newConfig: Partial<ResumeThemeConfig>) => void;
  onThemeReset: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onOpenStylePanel: () => void;
  onCloseStylePanel: () => void;
}

export function HeaderActionsProvider({
  children,
  onImportClick,
  onLanguageToggle,
  onThemeToggle,
  onTemplateChange,
  onThemeChange,
  onThemeReset,
  onOpenSettings,
  onCloseSettings,
  onOpenStylePanel,
  onCloseStylePanel,
}: HeaderActionsProviderProps) {
  const value = useMemo(() => ({
    onImportClick,
    onLanguageToggle,
    onThemeToggle,
    onTemplateChange,
    onThemeChange,
    onThemeReset,
    onOpenSettings,
    onCloseSettings,
    onOpenStylePanel,
    onCloseStylePanel,
  }), [
    onImportClick,
    onLanguageToggle,
    onThemeToggle,
    onTemplateChange,
    onThemeChange,
    onThemeReset,
    onOpenSettings,
    onCloseSettings,
    onOpenStylePanel,
    onCloseStylePanel,
  ]);
  
  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

export function useHeaderActions(): HeaderActionsContextValue {
  const context = useContext(HeaderActionsContext);
  if (!context) {
    throw new Error('useHeaderActions must be used within HeaderActionsProvider');
  }
  return context;
}
