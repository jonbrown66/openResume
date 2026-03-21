import { useCallback, useMemo } from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import {
  translations,
  type AppTheme,
} from '@/config/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useResumeImport } from '@/hooks/useResumeImport';
import { useResumeProjects } from '@/hooks/useResumeProjects';
import { useResumeWorkspaceState } from '@/hooks/useResumeWorkspaceState';
import { useSettings } from '@/hooks/useSettings';
import { resolveImportNoticeMessage } from '@/utils/importNotice';

export default function App() {
  const { settings, updateSettings, updateProvider, setActiveProvider } = useSettings();
  const { resolvedTheme } = useAppTheme(settings.theme);
  const {
    projects,
    currentProject,
    createProject,
    switchProject,
    updateProject,
    renameProject,
    deleteProject,
  } = useResumeProjects();
  const {
    markdown,
    setMarkdown,
    draft,
    setDraft,
    template,
    setTemplate,
    activeView,
    setActiveView,
    editorMode,
    handleEditorModeChange,
    resumeTheme,
    updateTheme,
    resetTheme,
    updateCustomCss,
    handleAssistantApply,
    handleImportComplete,
    activeDraft,
    editorContainerRef,
    previewContainerRef,
    resumeRef,
    scale,
    zoomPercent,
    resetZoom,
    updateZoom,
  } = useResumeWorkspaceState({
    currentProject,
    updateProject,
  });

  const lang = settings.language;
  const t = useMemo(() => translations[lang], [lang]);

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
    onImportComplete: handleImportComplete,
  });

  const handleLanguageToggle = useCallback(() => {
    updateSettings({ language: lang === 'en' ? 'zh' : 'en' });
  }, [lang, updateSettings]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme: AppTheme =
      settings.theme === 'light'
        ? 'dark'
        : settings.theme === 'dark'
          ? 'system'
          : 'light';
    updateSettings({ theme: nextTheme });
  }, [settings.theme, updateSettings]);

  const noticeMessage = resolveImportNoticeMessage({
    importError,
    importNotice,
    importNoticeDetail,
    translations: t,
  });

  return (
    <ToastProvider>
      <WorkspaceShell
        settings={settings}
        lang={lang}
        theme={settings.theme}
        resolvedTheme={resolvedTheme}
        translations={t}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        isImporting={isImporting}
        importStep={importStep}
        noticeMessage={noticeMessage}
        markdown={markdown}
        draft={draft}
        activeDraft={activeDraft}
        editorMode={editorMode}
        activeView={activeView}
        template={template}
        resumeTheme={resumeTheme}
        projects={projects}
        currentProject={currentProject}
        canvasRef={resumeRef}
        editorContainerRef={editorContainerRef}
        previewContainerRef={previewContainerRef}
        scale={scale}
        zoomPercent={zoomPercent}
        onImportClick={triggerImport}
        onLanguageToggle={handleLanguageToggle}
        onThemeToggle={handleThemeToggle}
        onUpdateProvider={updateProvider}
        onSetActiveProvider={setActiveProvider}
        onThemeChange={updateTheme}
        onThemeReset={resetTheme}
        onUpdateSettings={updateSettings}
        onProjectSwitch={switchProject}
        onProjectCreate={createProject}
        onProjectRename={renameProject}
        onProjectDelete={deleteProject}
        onDraftChange={setDraft}
        onMarkdownChange={setMarkdown}
        onEditorModeChange={handleEditorModeChange}
        onTemplateChange={setTemplate}
        onActiveViewChange={setActiveView}
        onZoomChange={updateZoom}
        onZoomReset={resetZoom}
        onCustomCssChange={updateCustomCss}
        onAssistantApply={handleAssistantApply}
      />
    </ToastProvider>
  );
}
