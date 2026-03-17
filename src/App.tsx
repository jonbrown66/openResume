import { useEffect, useMemo, useRef, useState } from 'react';

import { AppHeader } from './components/AppHeader';
import { EditorPane } from './components/EditorPane';
import { MobileViewToggle } from './components/MobileViewToggle';
import { PreviewPane } from './components/PreviewPane';
import {
  translations,
  type ActiveView,
  type AppLanguage,
  type AppTheme,
  type EditorMode,
  type ResumeTemplate,
} from './config/ui';
import { defaultMarkdownEn, defaultMarkdownZh } from './constants';
import { useCanvasScale } from './hooks/useCanvasScale';
import { usePrintExport } from './hooks/usePrintExport';
import { useResumeImport } from './hooks/useResumeImport';
import { useSettings } from './hooks/useSettings';
import { parseMarkdownToResumeDraft, serializeResumeDraftToMarkdown } from './utils/resumeDocument';

export default function App() {
  const [lang, setLang] = useState<AppLanguage>('zh');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [markdown, setMarkdown] = useState(defaultMarkdownZh);
  const [draft, setDraft] = useState(() => parseMarkdownToResumeDraft(defaultMarkdownZh));
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const { settings, updateProvider, setActiveProvider } = useSettings();

  // Sync theme to document root for global CSS and potential library compatibility
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  // Sync state cleanly when switching modes
  const handleEditorModeChange = (newMode: EditorMode) => {
    if (newMode === 'blocks' && editorMode === 'markdown') {
      setDraft(parseMarkdownToResumeDraft(markdown));
    } else if (newMode === 'markdown' && editorMode === 'blocks') {
      setMarkdown(serializeResumeDraftToMarkdown(draft));
    }
    setEditorMode(newMode);
  };
  const { scale, zoomPercent, resetZoom, updateZoom } = useCanvasScale(previewContainerRef.current);
  const { exportToPdf, isExporting } = usePrintExport();
  const {
    fileInputRef,
    handleFileChange,
    importError,
    importNotice,
    isImporting,
    triggerImport,
  } = useResumeImport({
    lang,
    settings,
    onImportComplete: (nextMarkdown) => {
      setMarkdown(nextMarkdown);
      setDraft(parseMarkdownToResumeDraft(nextMarkdown));
      setActiveView('editor');
      setEditorMode('markdown'); // Default to markdown to show raw imported text
    },
  });

  const t = translations[lang];

  const handleLanguageToggle = () => {
    setLang((current) => (current === 'en' ? 'zh' : 'en'));
  };

  const noticeMessage = importError
    ? t.importFailed
    : importNotice === 'missing-api-key'
      ? t.importNoApiKey
      : '';

  return (
    <div className={`h-screen w-full sm:p-4 md:p-8 transition-colors duration-300 font-sans flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#e8e6e1]'}`}>
      <div className="flex flex-col w-full h-full max-w-[1600px] bg-white dark:bg-gray-900 sm:rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden sm:border border-gray-200/60 dark:border-gray-800 transition-colors duration-300">
        <AppHeader
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          isExporting={isExporting}
          isImporting={isImporting}
          lang={lang}
          theme={theme}
          translations={t}
          onExport={exportToPdf}
          onImportClick={triggerImport}
          onLanguageToggle={handleLanguageToggle}
          onThemeToggle={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
          settings={settings}
          onUpdateProvider={updateProvider}
          onSetActiveProvider={setActiveProvider}
        />

        {noticeMessage ? (
          <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-amber-200/50 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 text-[11px] sm:text-sm transition-colors duration-300 print:hidden">
            {noticeMessage}
          </div>
        ) : null}

        <div className="flex flex-1 overflow-hidden relative">
          <div className={`${activeView === 'editor' ? 'flex' : 'hidden'} lg:flex w-full`}>
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
          </div>

          <div className={`${activeView === 'preview' ? 'flex' : 'hidden'} lg:flex w-full`}>
            <PreviewPane
              containerRef={previewContainerRef}
              draft={editorMode === 'markdown' ? parseMarkdownToResumeDraft(markdown) : draft}
              resumeRef={resumeRef}
              scale={scale}
              template={template}
              translations={t}
              zoomPercent={zoomPercent}
              onTemplateChange={setTemplate}
              onZoomChange={updateZoom}
              onZoomReset={resetZoom}
            />
          </div>
        </div>

        <MobileViewToggle activeView={activeView} translations={t} onChange={setActiveView} />
      </div>
    </div>
  );
}
