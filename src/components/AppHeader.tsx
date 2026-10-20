import { type ReactNode, memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Moon, Settings, Sun, Monitor, Palette, Github, MoreHorizontal, Globe } from 'lucide-react';
import type { AppLanguage, AppTheme, TranslationSet } from '@/config/ui';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import type { ResumeThemeConfig } from '@/types/theme';
import { deferredComponent, useIdlePreload } from '@/lib/deferredComponent';
import type { AiSettingsProps } from './settings/AiSettings';
import type { ThemeEditorPanelProps } from './ThemeEditorPanel';
import { AnchoredPanel } from './ui/AnchoredPanel';
import type { HeaderMoreMenuProps } from './HeaderMoreMenu';
const HeaderMoreMenu = deferredComponent<HeaderMoreMenuProps>(
  () => import('./HeaderMoreMenu').then(module => ({ default: module.HeaderMoreMenu })),
  props => <button type="button" disabled aria-busy="true" aria-label={props.label}
    className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2"><MoreHorizontal size={18} /></button>,
);

const AiSettings = deferredComponent<AiSettingsProps>(
  () => import('./settings/AiSettings').then(module => ({ default: module.AiSettings })),
  props => <p role="status">{props.settings.language === 'zh' ? '加载设置…' : 'Loading settings…'}</p>,
);
const ThemeEditorPanel = deferredComponent<ThemeEditorPanelProps>(
  () => import('./ThemeEditorPanel').then(module => ({ default: module.ThemeEditorPanel })),
  props => <AnchoredPanel compactPanel title={props.lang === 'zh' ? '样式编辑器' : 'Style Editor'} closeLabel={props.lang === 'zh' ? '关闭' : 'Close'} triggerRef={props.triggerRef} anchorRect={props.anchorRect} onClose={props.onClose}>
    <p role="status">{props.lang === 'zh' ? '加载样式…' : 'Loading styles…'}</p>
  </AnchoredPanel>,
);
const headerPreloads = [AiSettings.preload, ThemeEditorPanel.preload, HeaderMoreMenu.preload];
const PROJECT_GITHUB_URL = 'https://github.com/jonbrown66/openResume';

const LogoIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <defs><linearGradient id="header-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#a9d56b" /><stop offset="100%" stopColor="#54702d" />
    </linearGradient></defs>
    <circle cx="16" cy="16" r="12" stroke="url(#header-logo-grad)" strokeWidth="2.5" />
    <path d="M12 21V11C12 10 13 9 14 9H17C18.5 9 19.5 10 19.5 11.5C19.5 13 18.5 14 17 14H12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 14L20 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface AppHeaderProps {
  lang: AppLanguage;
  theme: AppTheme;
  resolvedTheme: 'light' | 'dark';
  translations: TranslationSet;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  settings: AppSettings;
  onUpdateProvider: (id: ApiProviderId, updates: Partial<AppSettings['providers'][ApiProviderId]>) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
  resumeTheme: ResumeThemeConfig;
  onThemeChange: (newConfig: Partial<ResumeThemeConfig>) => void;
  onThemeReset: () => void;
  saveStatus?: 'saved' | 'saving';
  projectSelector: ReactNode;
  importControl: ReactNode;
  exportControl: ReactNode;
}

export const AppHeader = memo(function AppHeader({
  lang, theme, resolvedTheme, translations: t, onLanguageToggle, onThemeToggle,
  settings, onUpdateProvider, onSetActiveProvider, resumeTheme, onThemeChange, onThemeReset, saveStatus,
  projectSelector, importControl, exportControl,
}: AppHeaderProps) {
  useIdlePreload(headerPreloads);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false);
  const styleButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMoreButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLElement>(null);
  const styleReturnFocusRef = useRef<HTMLElement>(null);
  const [styleAnchorRect, setStyleAnchorRect] = useState<DOMRect | null>(null);

  const handleToggleSettings = useCallback(() => {
    settingsTriggerRef.current = window.innerWidth >= 1024 ? settingsButtonRef.current : mobileMoreButtonRef.current;
    setIsStylePanelOpen(false);
    setIsSettingsOpen(previous => !previous);
  }, []);
  useEffect(() => {
    if (!isSettingsOpen) return;
    const outside = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && !settingsButtonRef.current?.contains(target)
        && !target.closest('[data-slot="select-content"],[data-overlay-portal],[role="menuitem"]')) setIsSettingsOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [isSettingsOpen]);

  const openStyle = (mobile: boolean) => {
    const trigger = mobile ? mobileMoreButtonRef.current : styleButtonRef.current;
    styleReturnFocusRef.current = trigger;
    setStyleAnchorRect(trigger?.getBoundingClientRect() ?? null);
    setIsSettingsOpen(false);
    setIsStylePanelOpen(previous => mobile || !previous);
  };
  const themeIcon = theme === 'system' ? <Monitor size={16} /> : resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />;
  const themeLabel = theme === 'system' ? t.themeAuto : theme === 'dark' ? t.themeDark : t.themeLight;

  return (
    <header className="app-header relative flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 transition-colors duration-200 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-6 sm:py-2.5 print:hidden z-50">
      <div className="hidden min-w-0 items-center 2xl:flex">
        <div className="flex items-center gap-2 mr-2">
          <span className="w-3 h-3 rounded-lg bg-red-400 dark:bg-red-500" />
          <span className="w-3 h-3 rounded-lg bg-amber-400 dark:bg-amber-500" />
          <span className="w-3 h-3 rounded-lg bg-green-400 dark:bg-green-500" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 justify-self-center sm:gap-3" aria-label="OpenResume">
        <LogoIcon />
        <span className="hidden text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 sm:inline sm:text-sm sm:tracking-wide">OpenResume</span>
      </div>
      <div className="col-start-3 ms-auto flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2 relative">
        {projectSelector}
        {saveStatus && <span role="status" className="text-right text-[11px] leading-tight text-[var(--ui-text-secondary)] max-sm:w-full max-sm:order-last max-sm:pt-1 sm:text-xs">
          {saveStatus === 'saving' ? (lang === 'zh' ? '正在保存到此浏览器…' : 'Saving to this browser…') : (lang === 'zh' ? '已保存到此浏览器' : 'Saved to this browser')}
        </span>}
        <button type="button" ref={styleButtonRef} onClick={() => openStyle(false)}
          className="app-control hidden items-center justify-center rounded-lg p-2 lg:flex" title={t.style} aria-label={t.style}>
          <Palette size={16} />
        </button>
        <button type="button" onClick={onThemeToggle} className="app-control hidden items-center justify-center rounded-lg p-2 lg:flex" title={themeLabel} aria-label={themeLabel}>{themeIcon}</button>
        <button type="button" onClick={onLanguageToggle} className="app-control hidden items-center justify-center rounded-lg p-2 lg:flex" title={t.toggleLanguage} aria-label={t.toggleLanguage}><Globe size={16} /></button>
        <button type="button" ref={settingsButtonRef} onClick={handleToggleSettings}
          className="app-control hidden items-center justify-center rounded-lg p-2 lg:flex" title={t.apiSettings} aria-label={t.apiSettings}><Settings size={16} /></button>
        <a href={PROJECT_GITHUB_URL} target="_blank" rel="noreferrer" className="app-control hidden items-center justify-center rounded-lg p-2 lg:flex" title={t.githubProject} aria-label={t.githubProject}><Github size={16} /></a>

        <div className="relative lg:hidden">
          <HeaderMoreMenu label={t.moreActions} triggerRef={mobileMoreButtonRef} onOpen={() => setIsStylePanelOpen(false)} actions={[
            { label: t.style, icon: <Palette size={16} />, onClick: () => openStyle(true), opensDialog: true },
            { label: themeLabel, icon: themeIcon, onClick: onThemeToggle },
            { label: t.toggleLanguage, icon: <Globe size={16} />, onClick: onLanguageToggle },
            { label: t.apiSettings, icon: <Settings size={16} />, onClick: handleToggleSettings, opensDialog: true },
            { label: t.githubProject, icon: <Github size={16} />, href: PROJECT_GITHUB_URL },
          ]} />
        </div>
        <div className="hidden sm:block w-px h-4 bg-[var(--app-border)] mx-1 sm:mx-2" />
        {importControl}
        {exportControl}
      </div>
      <AnimatePresence>
        {isStylePanelOpen && <ThemeEditorPanel key="style" triggerRef={styleReturnFocusRef} anchorRect={styleAnchorRect} theme={resumeTheme} lang={lang}
          onChange={onThemeChange} onReset={onThemeReset} onClose={() => setIsStylePanelOpen(false)} />}
        {isSettingsOpen && <AnchoredPanel key="settings" title={t.settingsTitle} closeLabel={t.close} triggerRef={settingsTriggerRef} onClose={() => setIsSettingsOpen(false)}>
          <AiSettings settings={settings} onUpdateProvider={onUpdateProvider} onSetActiveProvider={onSetActiveProvider} />
        </AnchoredPanel>}
      </AnimatePresence>
    </header>
  );
});
