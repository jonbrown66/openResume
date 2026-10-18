import { useCallback, useEffect, useMemo } from 'react';
import { MotionConfig } from 'framer-motion';

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
import { startInitialModelRefresh } from '@/hooks/useModelCatalog';

export default function App() {
  const { settings, updateSettings, updateProvider, setActiveProvider, storageError: settingsStorageError } = useSettings();
  useEffect(() => {
    startInitialModelRefresh();
  }, []);
  const { resolvedTheme } = useAppTheme(settings.theme);
  const {
    projects,
    currentProject,
    createProject,
    switchProject,
    updateProject,
    renameProject,
    deleteProject,
    storageError,
  } = useResumeProjects(settings.language);
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
    handleFormatMarkdown,
    activeDraft,
    previewPending,
    editorContainerRef,
    previewContainerRef,
    resumeRef,
    scale,
    zoomPercent,
    resetZoom,
    updateZoom,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
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
    projectId: currentProject?.id,
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

  const storageMessage = settingsStorageError || storageError
    ? (lang === 'zh' ? (storageError === 'recovered' ? '存储数据损坏：原始数据已备份在 resume_projects-recovery 项中。' : '浏览器存储不可用，修改暂未保存。请先导出备份，避免关闭页面丢失内容。')
      : (storageError === 'recovered' ? 'Damaged storage was backed up under resume_projects-recovery.' : 'Browser storage is unavailable. Changes are not saved. Export a backup before closing this page.')) : '';
  const noticeMessage = storageMessage || resolveImportNoticeMessage({
    importError,
    importNotice,
    importNoticeDetail,
    translations: t,
  });

  return (
    <MotionConfig reducedMotion="user"><ToastProvider language={lang}>
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
        previewPending={previewPending}
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
        onFormatMarkdown={handleFormatMarkdown}
        onEditorModeChange={handleEditorModeChange}
        onTemplateChange={setTemplate}
        onActiveViewChange={setActiveView}
        onZoomChange={updateZoom}
        onZoomReset={resetZoom}
        onCustomCssChange={updateCustomCss}
        onAssistantApply={handleAssistantApply}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    </ToastProvider></MotionConfig>
  );
}
