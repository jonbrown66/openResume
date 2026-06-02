import { type ChangeEvent, type RefObject, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages,
  Loader2,
  Moon,
  Printer,
  Settings,
  Sun,
  Monitor,
  Upload,
  ChevronDown,
  Palette,
  Github,
  MoreHorizontal,
} from 'lucide-react';

import type { AppLanguage, AppTheme, TranslationSet, ResumeTemplate } from '@/config/ui';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeProject } from '@/types/resumeProject';
import { SettingsModal } from './SettingsModal';
import { ExportMenu } from './ExportMenu';
import { ProjectSelector } from './ProjectSelector';
import type { ResumeThemeConfig } from '@/types/theme';
import { ThemeEditorPanel } from './ThemeEditorPanel';
import { buttonHoverVariants, springTransition } from '@/lib/motion';

const PROJECT_GITHUB_URL = 'https://github.com/jonbrown66/openResume';

interface AppHeaderProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isImporting: boolean;
  importStep: 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';
  lang: AppLanguage;
  theme: AppTheme;
  resolvedTheme: 'light' | 'dark';
  translations: TranslationSet;
  canvasRef: RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  onImportClick: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  settings: AppSettings;
  onUpdateProvider: (id: ApiProviderId, updates: any) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
  resumeTheme: ResumeThemeConfig;
  onThemeChange: (newConfig: Partial<ResumeThemeConfig>) => void;
  onThemeReset: () => void;
  template: ResumeTemplate;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  projects: ResumeProject[];
  currentProject: ResumeProject | undefined;
  onProjectSwitch: (id: string) => void;
  onProjectCreate: () => void;
  onProjectRename: (id: string, newName: string) => void;
  onProjectDelete: (id: string) => void;
}

export const AppHeader = memo(function AppHeader({
  fileInputRef,
  onFileChange,
  isImporting,
  importStep,
  lang,
  theme,
  resolvedTheme,
  translations: t,
  canvasRef,
  draft,
  onImportClick,
  onLanguageToggle,
  onThemeToggle,
  settings,
  onUpdateProvider,
  onSetActiveProvider,
  resumeTheme,
  onThemeChange,
  onThemeReset,
  template,
  onUpdateSettings,
  projects,
  currentProject,
  onProjectSwitch,
  onProjectCreate,
  onProjectRename,
  onProjectDelete,
}: AppHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const styleButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);
  const mobileMoreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMoreButtonRef = useRef<HTMLButtonElement>(null);
  const mobileStyleTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobileMoreRect, setMobileMoreRect] = useState<DOMRect | null>(null);
  const [styleAnchorRect, setStyleAnchorRect] = useState<DOMRect | null>(null);

  const handleOpenSettings = useCallback(() => {
    setIsMobileMoreOpen(false);
    setIsSettingsOpen(true);
  }, []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleToggleStylePanel = useCallback(() => {
    setStyleAnchorRect(styleButtonRef.current?.getBoundingClientRect() ?? null);
    setIsStylePanelOpen(prev => !prev);
  }, []);
  const handleMobileStylePanelOpen = useCallback(() => {
    setStyleAnchorRect(mobileStyleTriggerRef.current?.getBoundingClientRect() ?? null);
    setIsStylePanelOpen(true);
    setIsMobileMoreOpen(false);
  }, []);
  const handleToggleTheme = useCallback(() => {
    setIsMobileMoreOpen(false);
    onThemeToggle();
  }, [onThemeToggle]);
  const handleToggleLanguage = useCallback(() => {
    setIsMobileMoreOpen(false);
    onLanguageToggle();
  }, [onLanguageToggle]);

  useEffect(() => {
    if (!isMobileMoreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!mobileMoreRef.current?.contains(target) && !mobileMoreMenuRef.current?.contains(target)) {
        setIsMobileMoreOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMoreOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMoreOpen]);

  useEffect(() => {
    if (!isMobileMoreOpen) return;

    const updateMenuPosition = () => {
      setMobileMoreRect(mobileMoreButtonRef.current?.getBoundingClientRect() ?? null);
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isMobileMoreOpen]);

  const stylePanelProps = useMemo(() => ({
    triggerRef: styleButtonRef,
    anchorRect: isStylePanelOpen ? styleAnchorRect : null,
    theme: resumeTheme,
    lang,
    onChange: onThemeChange,
    onReset: onThemeReset,
    onClose: () => setIsStylePanelOpen(false),
  }), [resumeTheme, lang, onThemeChange, onThemeReset, isStylePanelOpen, styleAnchorRect]);

  const exportMenuProps = useMemo(() => ({
    canvasRef,
    draft,
    theme: resumeTheme,
    template,
    translations: t,
  }), [canvasRef, draft, resumeTheme, template, t]);

  const themeIcon = useMemo(() => {
    if (theme === 'system') return <Monitor size={16} />;
    return resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />;
  }, [theme, resolvedTheme]);

  const themeLabel = useMemo(() => {
    if (theme === 'system') return t.themeAuto;
    if (theme === 'dark') return t.themeDark;
    return t.themeLight;
  }, [theme, t]);

  const mobileMenuItemClass = 'app-control flex w-full min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors';

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 transition-colors duration-200 sm:px-6 sm:py-4 print:hidden z-20">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
        <span className="hidden text-[10px] font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 sm:inline sm:text-sm sm:tracking-wide">
          OpenResume
        </span>
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <motion.div 
            className="w-3 h-3 rounded-lg bg-red-400 dark:bg-red-500"
            whileHover={{ scale: 1.2 }}
            transition={springTransition}
          />
          <motion.div 
            className="w-3 h-3 rounded-lg bg-amber-400 dark:bg-amber-500"
            whileHover={{ scale: 1.2 }}
            transition={springTransition}
          />
          <motion.div 
            className="w-3 h-3 rounded-lg bg-green-400 dark:bg-green-500"
            whileHover={{ scale: 1.2 }}
            transition={springTransition}
          />
        </div>
        <ProjectSelector
          projects={projects}
          currentProject={currentProject}
          onSwitch={onProjectSwitch}
          onCreate={onProjectCreate}
          onRename={onProjectRename}
          onDelete={onProjectDelete}
        />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <div className="hidden sm:block">
          <motion.button
            ref={styleButtonRef}
            onClick={handleToggleStylePanel}
            className="app-control flex items-center justify-center rounded-lg p-2 transition-colors"
            title={t.style}
            aria-label={t.style}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Palette size={16} />
          </motion.button>
          <AnimatePresence>
            {isStylePanelOpen && (
              <ThemeEditorPanel {...stylePanelProps} />
            )}
          </AnimatePresence>
        </div>
        
        <motion.button
          onClick={handleToggleTheme}
          className="app-control hidden items-center justify-center rounded-lg p-2 transition-colors sm:flex"
          title={themeLabel}
          aria-label={themeLabel}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {themeIcon}
        </motion.button>
        
        <motion.button
          onClick={handleToggleLanguage}
          className="app-control hidden items-center justify-center rounded-lg p-2 transition-colors sm:flex"
          title={t.toggleLanguage}
          aria-label={t.toggleLanguage}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Languages size={16} />
          <span className="ml-1 text-[10px] font-bold uppercase">{lang === 'en' ? '中' : 'EN'}</span>
        </motion.button>
        
        <motion.button
          onClick={handleOpenSettings}
          className="app-control hidden items-center justify-center rounded-lg p-2 transition-colors sm:flex"
          title={t.apiSettings}
          aria-label={t.apiSettings}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings size={16} />
        </motion.button>

        <motion.a
          href={PROJECT_GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="app-control hidden items-center justify-center rounded-lg p-2 transition-colors sm:flex"
          title={t.githubProject}
          aria-label={t.githubProject}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Github size={16} />
        </motion.a>

        <div className="relative sm:hidden" ref={mobileMoreRef}>
          <motion.button
            ref={mobileMoreButtonRef}
            type="button"
            onClick={() => {
              setIsStylePanelOpen(false);
              setMobileMoreRect(mobileMoreButtonRef.current?.getBoundingClientRect() ?? null);
              setIsMobileMoreOpen(prev => !prev);
            }}
            className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 transition-colors"
            aria-label={t.moreActions}
            aria-expanded={isMobileMoreOpen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MoreHorizontal size={18} />
          </motion.button>
          {typeof document !== 'undefined' ? createPortal(
            <AnimatePresence>
              {isMobileMoreOpen && (
              <motion.div
                ref={mobileMoreMenuRef}
                role="menu"
                aria-label={t.moreActions}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: mobileMoreRect ? mobileMoreRect.bottom + 8 : 56,
                  right: mobileMoreRect ? Math.max(8, window.innerWidth - mobileMoreRect.right) : 8,
                }}
                className="app-panel z-[120] w-56 rounded-xl border p-1.5"
              >
                <button
                  ref={mobileStyleTriggerRef}
                  type="button"
                  role="menuitem"
                  onClick={handleMobileStylePanelOpen}
                  className={mobileMenuItemClass}
                >
                  <Palette size={16} />
                  <span>{t.style}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleToggleTheme}
                  className={mobileMenuItemClass}
                >
                  {themeIcon}
                  <span>{themeLabel}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleToggleLanguage}
                  className={mobileMenuItemClass}
                >
                  <Languages size={16} />
                  <span>{t.toggleLanguage}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleOpenSettings}
                  className={mobileMenuItemClass}
                >
                  <Settings size={16} />
                  <span>{t.apiSettings}</span>
                </button>
                <a
                  role="menuitem"
                  href={PROJECT_GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsMobileMoreOpen(false)}
                  className={mobileMenuItemClass}
                >
                  <Github size={16} />
                  <span>{t.githubProject}</span>
                </a>
              </motion.div>
              )}
            </AnimatePresence>,
            document.body
          ) : null}
        </div>
        
        <div className="hidden sm:block w-px h-4 bg-[var(--app-border)] mx-1 sm:mx-2"></div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
        />

        <motion.button
          onClick={onImportClick}
          disabled={isImporting}
          className="app-secondary hidden items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isImporting && importStep === 'extracting' && t.extracting}
          {isImporting && importStep === 'parsing' && t.parsing}
          {isImporting && importStep === 'formatting' && t.aiFormatting}
          {isImporting && importStep !== 'extracting' && importStep !== 'parsing' && importStep !== 'formatting' && t.importing}
          {!isImporting && t.import}
        </motion.button>
        
        <motion.button
          onClick={onImportClick}
          disabled={isImporting}
          className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 transition-colors disabled:opacity-50 sm:hidden"
          aria-label={t.import}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        </motion.button>

        <ExportMenu {...exportMenuProps}>
          <motion.button
            className="app-primary hidden items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Printer size={14} />
            {t.export}
            <ChevronDown size={12} />
          </motion.button>
          <motion.button
            className="app-primary flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 transition-colors disabled:opacity-50 sm:hidden"
            aria-label={t.export}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Printer size={16} />
          </motion.button>
        </ExportMenu>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        settings={settings}
        lang={lang}
        onUpdateProvider={onUpdateProvider}
        onSetActiveProvider={onSetActiveProvider}
        onUpdateSettings={onUpdateSettings}
      />
    </header>
  );
});
