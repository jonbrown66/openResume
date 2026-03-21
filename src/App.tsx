import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { AppHeader } from './components/AppHeader';
import { EditorPane } from './components/EditorPane';
import { MobileViewToggle } from './components/MobileViewToggle';
import { PreviewPane } from './components/PreviewPane';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import {
  translations,
  type ActiveView,
  type AppLanguage,
  type AppTheme,
  type EditorMode,
  type ResumeTemplate,
} from './config/ui';
import { defaultMarkdownZh } from './constants';
import { useCanvasScale } from './hooks/useCanvasScale';
import { useResumeImport } from './hooks/useResumeImport';
import { useResumeProjects } from './hooks/useResumeProjects';
import { useSettings } from './hooks/useSettings';
import { useAppTheme } from './hooks/useAppTheme';
import { parseMarkdownToResumeDraft, serializeResumeDraftToMarkdown } from './utils/resumeDocument';
import type { ResumeDraft } from './types/resume';
import type { ResumeThemeConfig } from './types/theme';
import { DEFAULT_THEME_CONFIG } from './types/theme';
import { slideUpVariants } from './lib/motion';

export default function App() {
  const { settings, updateSettings, updateProvider, setActiveProvider } = useSettings();
  const lang = settings.language;
  const theme = settings.theme;
  const { resolvedTheme } = useAppTheme(theme);
  const {
    projects,
    currentProject,
    createProject,
    switchProject,
    updateProject,
    renameProject,
    deleteProject,
  } = useResumeProjects();
  const [markdown, setMarkdown] = useState(defaultMarkdownZh);
  const [draft, setDraft] = useState(() => parseMarkdownToResumeDraft(defaultMarkdownZh));
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const markdownDraftCache = useRef<ResumeDraft | null>(null);
  const lastMarkdownRef = useRef<string>(markdown);
  const [resumeTheme, setResumeTheme] = useState<ResumeThemeConfig>(
    currentProject?.theme ?? DEFAULT_THEME_CONFIG
  );

  const handleEditorModeChange = useCallback((newMode: EditorMode) => {
    if (newMode === 'blocks' && editorMode === 'markdown') {
      setDraft(parseMarkdownToResumeDraft(markdown));
    } else if (newMode === 'markdown' && editorMode === 'blocks') {
      setMarkdown(serializeResumeDraftToMarkdown(draft));
    }
    setEditorMode(newMode);
  }, [editorMode, markdown, draft]);
  
  const { scale, zoomPercent, resetZoom, updateZoom } = useCanvasScale(previewContainerRef);
  
  const {
    fileInputRef,
    handleFileChange,
    importError,
    importNotice,
    importNoticeDetail,
    isImporting,
    importStep,
    triggerImport,
  } = useResumeImport({
    lang,
    settings,
    onImportComplete: (nextMarkdown) => {
      setMarkdown(nextMarkdown);
      setDraft(parseMarkdownToResumeDraft(nextMarkdown));
      setActiveView('editor');
      setEditorMode('markdown');
    },
  });

  const t = useMemo(() => translations[lang], [lang]);

  const activeDraft = useMemo(() => {
    if (editorMode === 'blocks') {
      return draft;
    }
    
    if (markdownDraftCache.current && markdown === lastMarkdownRef.current) {
      return markdownDraftCache.current;
    }
    
    const parsed = parseMarkdownToResumeDraft(markdown);
    markdownDraftCache.current = parsed;
    lastMarkdownRef.current = markdown;
    return parsed;
  }, [editorMode, markdown, draft]);

  const handleLanguageToggle = useCallback(() => {
    updateSettings({ language: lang === 'en' ? 'zh' : 'en' });
  }, [lang, updateSettings]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme: AppTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    updateSettings({ theme: nextTheme });
  }, [theme, updateSettings]);

  const updateTheme = useCallback((newConfig: Partial<ResumeThemeConfig>) => {
    setResumeTheme(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetTheme = useCallback(() => {
    setResumeTheme(DEFAULT_THEME_CONFIG);
  }, []);

  const updateCustomCss = useCallback((css: string) => {
    setResumeTheme(prev => ({ ...prev, customCss: css }));
  }, []);

  useEffect(() => {
    if (currentProject) {
      const parsed = parseMarkdownToResumeDraft(markdown);
      updateProject(currentProject.id, { data: parsed });
    }
  }, [markdown, currentProject?.id, updateProject]);

  useEffect(() => {
    if (currentProject) {
      updateProject(currentProject.id, { templateId: template });
    }
  }, [template, currentProject?.id, updateProject]);

  useEffect(() => {
    if (currentProject) {
      updateProject(currentProject.id, { theme: resumeTheme });
    }
  }, [resumeTheme, currentProject?.id, updateProject]);

  useEffect(() => {
    if (currentProject) {
      setMarkdown(serializeResumeDraftToMarkdown(currentProject.data));
      setTemplate(currentProject.templateId);
      setResumeTheme(currentProject.theme);
    }
  }, [currentProject?.id]);

  const noticeMessage = importError
    ? t.importFailed
    : importNotice === 'missing-api-key'
      ? t.importNoApiKey
      : importNotice === 'missing-model'
        ? t.importMissingModel
        : importNotice === 'ai-format-fallback'
          ? importNoticeDetail
            ? `${t.importAiFallback} ${importNoticeDetail}`
            : t.importAiFallback
      : '';

  return (
    <ToastProvider>
    <main className={`h-screen w-full sm:p-4 md:p-8 transition-colors duration-200 font-sans flex items-center justify-center overflow-hidden ${resolvedTheme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      <motion.div 
        className="flex flex-col w-full h-full max-w-[1600px] bg-white dark:bg-zinc-900 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] overflow-hidden sm:border border-zinc-200/60 dark:border-zinc-800/60 transition-colors duration-200"
        initial="hidden"
        animate="visible"
        variants={slideUpVariants}
      >
        <AppHeader
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          isImporting={isImporting}
          importStep={importStep}
          lang={lang}
          theme={theme}
          resolvedTheme={resolvedTheme}
          translations={t}
          canvasRef={resumeRef}
          draft={activeDraft}
          onImportClick={triggerImport}
          onLanguageToggle={handleLanguageToggle}
          onThemeToggle={handleThemeToggle}
          settings={settings}
          onUpdateProvider={updateProvider}
          onSetActiveProvider={setActiveProvider}
          resumeTheme={resumeTheme}
          onThemeChange={updateTheme}
          onThemeReset={resetTheme}
          template={template}
          onUpdateSettings={updateSettings}
          projects={projects}
          currentProject={currentProject}
          onProjectSwitch={switchProject}
          onProjectCreate={createProject}
          onProjectRename={renameProject}
          onProjectDelete={deleteProject}
        />

        <AnimatePresence mode="wait">
          {noticeMessage && (
            <motion.div 
              className="px-4 sm:px-6 py-2 sm:py-3 border-b border-amber-200/50 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 text-[11px] sm:text-sm transition-colors duration-200 print:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {noticeMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeView}
              className={`${activeView === 'editor' ? 'flex' : 'hidden'} lg:flex w-full`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EditorPane
                containerRef={editorContainerRef}
                draft={draft}
                editorMode={editorMode}
                lang={lang}
                isImporting={isImporting}
                markdown={markdown}
                translations={t}
                onDraftChange={setDraft}
                onEditorModeChange={handleEditorModeChange}
                onMarkdownChange={setMarkdown}
              />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div 
              key={`preview-${activeView}`}
              className={`${activeView === 'preview' ? 'flex' : 'hidden'} lg:flex w-full`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ErrorBoundary>
                <PreviewPane
                  containerRef={previewContainerRef}
                  draft={activeDraft}
                  resumeRef={resumeRef}
                  scale={scale}
                  template={template}
                  theme={resumeTheme}
                  translations={t}
                  zoomPercent={zoomPercent}
                  lang={lang}
                  onTemplateChange={setTemplate}
                  onZoomChange={updateZoom}
                  onZoomReset={resetZoom}
                  onCustomCssChange={updateCustomCss}
                  onCustomCssReset={() => updateCustomCss('')}
                  currentFont={resumeTheme.fontFamily}
                />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>

        <MobileViewToggle activeView={activeView} translations={t} onChange={setActiveView} />
      </motion.div>
    </main>
    </ToastProvider>
  );
}
