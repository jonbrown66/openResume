import { type ChangeEvent, type RefObject, memo, useCallback, useMemo, useRef, useState } from 'react';
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
  const styleButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleToggleStylePanel = useCallback(() => setIsStylePanelOpen(prev => !prev), []);

  const stylePanelProps = useMemo(() => ({
    triggerRef: styleButtonRef,
    anchorRect: isStylePanelOpen && styleButtonRef.current 
      ? styleButtonRef.current.getBoundingClientRect() 
      : null,
    theme: resumeTheme,
    lang,
    onChange: onThemeChange,
    onReset: onThemeReset,
    onClose: () => setIsStylePanelOpen(false),
  }), [resumeTheme, lang, onThemeChange, onThemeReset, isStylePanelOpen]);

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

  return (
    <header className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0 z-20 transition-colors duration-200 print:hidden">
      <div className="flex items-center gap-1 sm:gap-3">
        <span className="text-[10px] sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider sm:tracking-wide truncate max-w-[100px] sm:max-w-none">
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

      <div className="flex items-center gap-1 sm:gap-2">
        <div>
          <motion.button
            ref={styleButtonRef}
            onClick={handleToggleStylePanel}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            title={t.style}
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
          onClick={onThemeToggle}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          title={themeLabel}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {themeIcon}
        </motion.button>
        
        <motion.button
          onClick={onLanguageToggle}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors flex items-center justify-center"
          title={t.toggleLanguage}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Languages size={16} />
          <span className="ml-1 text-[10px] font-bold uppercase">{lang === 'en' ? '中' : 'EN'}</span>
        </motion.button>
        
        <motion.button
          onClick={handleOpenSettings}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          title={t.apiSettings}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings size={16} />
        </motion.button>

        <motion.a
          href={PROJECT_GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors flex items-center justify-center"
          title={t.githubProject}
          aria-label={t.githubProject}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Github size={16} />
        </motion.a>
        
        <div className="hidden sm:block w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1 sm:mx-2"></div>

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
          className="hidden sm:flex px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs transition-all font-medium items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="sm:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center disabled:opacity-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        </motion.button>

        <ExportMenu {...exportMenuProps}>
          <motion.button
            className="hidden sm:flex px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs transition-all font-medium shadow-sm hover:shadow-md items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Printer size={14} />
            {t.export}
            <ChevronDown size={12} />
          </motion.button>
          <motion.button
            className="sm:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center disabled:opacity-50"
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
