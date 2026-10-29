import { useCallback, useEffect, useMemo, useRef } from 'react';
import { MotionConfig } from 'framer-motion';

import { ToastProvider } from '@/components/ui/Toast';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { WorkspaceAssistant } from '@/components/WorkspaceAssistant';
import { AppHeader } from '@/components/AppHeader';
import { ProjectSelector } from '@/components/ProjectSelector';
import { ImportResumeButton } from '@/components/ImportResumeButton';
import type { ExportMenuProps } from '@/components/ExportMenu';
import { deferredComponent, useIdlePreload } from '@/lib/deferredComponent';
import { Loader2, ChevronDown } from 'lucide-react';
import { EditorPane } from '@/components/EditorPane';
import { PreviewPane } from '@/components/PreviewPane';
import {
  translations,
  type AppTheme,
} from '@/config/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { useResumeImport } from '@/hooks/useResumeImport';
import { useResumeProjects } from '@/hooks/useResumeProjects';
import { useResumeWorkspaceState } from '@/hooks/useResumeWorkspaceState';
import { useSettings } from '@/hooks/useSettings';
import { resolveImportNoticeMessage } from '@/utils/importNotice';
import { startInitialModelRefresh } from '@/hooks/useModelCatalog';

const ExportMenu = deferredComponent<ExportMenuProps>(
  () => import('@/components/ExportMenu').then(module => ({ default: module.ExportMenu })),
  props => <button type="button" disabled aria-busy="true" aria-label={props.translations.export}
    className="app-primary flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg p-2 lg:min-h-0 lg:px-4 lg:py-2">
    <Loader2 size={16} className="animate-spin" /><span className="text-xs lg:text-sm">{props.translations.export}</span>
    <ChevronDown size={12} className="hidden lg:block" />
  </button>,
);
const exportPreloads = [ExportMenu.preload];

export default function App() {
  useIdlePreload(exportPreloads);
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
    saveState,
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

  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;
  const {
    importTarget,
    setImportTarget,
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
    onImportComplete: (content, target) => {
      if (!target.projectId) {
        createProject({ markdown: content, name: target.fileName.replace(/\.[^.]+$/, '') });
      } else if (target.projectId === currentProjectRef.current?.id) {
        handleImportComplete(content);
      } else {
        updateProject(target.projectId, { markdown: content, data: parseMarkdownToResumeDraft(content) });
      }
    },
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

  const resetCustomCss = useCallback(() => updateCustomCss(''), [updateCustomCss]);

  return (
    <MotionConfig reducedMotion="user"><ToastProvider language={lang}>
      <WorkspaceShell
        lang={lang}
        translations={t}
        noticeMessage={noticeMessage}
        activeView={activeView}
        onActiveViewChange={setActiveView}
        header={<AppHeader
          lang={lang} theme={settings.theme} resolvedTheme={resolvedTheme} translations={t}
          onLanguageToggle={handleLanguageToggle} onThemeToggle={handleThemeToggle}
          settings={settings} onUpdateProvider={updateProvider} onSetActiveProvider={setActiveProvider}
          resumeTheme={resumeTheme} onThemeChange={updateTheme} onThemeReset={resetTheme}
          saveStatus={storageMessage ? undefined : saveState}
          projectSelector={<ProjectSelector lang={lang} projects={projects} currentProject={currentProject}
            onSwitch={switchProject} onCreate={createProject} onRename={renameProject} onDelete={deleteProject} />}
          importControl={<ImportResumeButton fileInputRef={fileInputRef} onFileChange={handleFileChange}
            isImporting={isImporting} importStep={importStep} onImportClick={triggerImport} translations={t}
            lang={lang} projectName={currentProject?.name ?? ''} importTarget={importTarget} onTargetChange={setImportTarget} />}
          exportControl={<ExportMenu markdown={markdown} canvasRef={resumeRef} draft={draft}
            theme={resumeTheme} template={template} translations={t} />}
        />}
        editor={<EditorPane key={currentProject?.id ?? 'default-project'} containerRef={editorContainerRef} draft={draft} editorMode={editorMode}
          lang={lang} isImporting={isImporting} markdown={markdown} translations={t}
          onDraftChange={setDraft} onEditorModeChange={handleEditorModeChange} onMarkdownChange={setMarkdown}
          onFormatMarkdown={handleFormatMarkdown} canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />}
        preview={<PreviewPane containerRef={previewContainerRef} draft={activeDraft} pending={previewPending}
          resumeRef={resumeRef} scale={scale} template={template} theme={resumeTheme} translations={t}
          zoomPercent={zoomPercent} lang={lang} onTemplateChange={setTemplate} onZoomChange={updateZoom}
          onCustomCssChange={updateCustomCss} onCustomCssReset={resetCustomCss}
          currentFont={resumeTheme.fontFamily} />}
        assistant={<WorkspaceAssistant lang={lang} markdown={markdown} projectId={currentProject?.id ?? 'default-project'}
          settings={settings} translations={t} onApplyMarkdown={handleAssistantApply}
          onUpdateProvider={updateProvider} onSetActiveProvider={setActiveProvider} />}
      />
    </ToastProvider></MotionConfig>
  );
}
