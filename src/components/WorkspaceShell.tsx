import { useCallback, useState, type ChangeEvent, type RefObject } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { AppHeader } from '@/components/AppHeader';
import { EditorPane } from '@/components/EditorPane';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ImportNoticeBanner } from '@/components/ImportNoticeBanner';
import { MobileViewToggle } from '@/components/MobileViewToggle';
import { PreviewPane } from '@/components/PreviewPane';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import type {
  ActiveView,
  AppLanguage,
  AppTheme,
  EditorMode,
  ResumeTemplate,
  TranslationSet,
} from '@/config/ui';
import { slideUpVariants } from '@/lib/motion';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeProject } from '@/types/resumeProject';
import type { ResumeThemeConfig } from '@/types/theme';
import type { EditContext } from '@/utils/editingHistory';

import { deferredComponent, useIdlePreload } from '@/lib/deferredComponent';
import type { AssistantWidgetProps } from '@/components/AssistantWidget';
const AssistantWidget = deferredComponent<AssistantWidgetProps>(
  () => import('@/components/AssistantWidget').then(module => ({ default: module.AssistantWidget })),
  props => <div className="app-ui ui-floating-tools pointer-events-none fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-end sm:inset-x-auto sm:bottom-6 sm:right-6">
    <button type="button" aria-label={props.lang === 'zh' ? '正在打开 AI 助手' : 'Opening AI assistant'} aria-busy="true" disabled className="app-primary inline-flex h-14 w-14 items-center justify-center rounded-full">
      <Loader2 size={22} className="animate-spin" />
    </button>
  </div>,
);
const assistantPreloads = [AssistantWidget.preload];

interface WorkspaceShellProps {
  settings: AppSettings;
  lang: AppLanguage;
  theme: AppTheme;
  resolvedTheme: 'light' | 'dark';
  translations: TranslationSet;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isImporting: boolean;
  importStep: 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';
  noticeMessage: string;
  markdown: string;
  draft: ResumeDraft;
  activeDraft: ResumeDraft;
  previewPending?: boolean;
  editorMode: EditorMode;
  activeView: ActiveView;
  template: ResumeTemplate;
  resumeTheme: ResumeThemeConfig;
  projects: ResumeProject[];
  currentProject: ResumeProject | undefined;
  canvasRef: RefObject<HTMLDivElement | null>;
  editorContainerRef: RefObject<HTMLDivElement | null>;
  previewContainerRef: RefObject<HTMLDivElement | null>;
  scale: number;
  zoomPercent: number;
  onImportClick: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  onUpdateProvider: (id: ApiProviderId, updates: Record<string, string>) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
  onThemeChange: (newConfig: Partial<ResumeThemeConfig>) => void;
  onThemeReset: () => void;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onProjectSwitch: (id: string) => void;
  onProjectCreate: () => void;
  onProjectRename: (id: string, newName: string) => void;
  onProjectDelete: (id: string) => void;
  onDraftChange: (draft: ResumeDraft) => void;
  onMarkdownChange: (markdown: string, context?: EditContext) => void;
  onFormatMarkdown: () => void;
  onEditorModeChange: (mode: EditorMode) => void;
  onTemplateChange: (template: ResumeTemplate) => void;
  onActiveViewChange: (view: ActiveView) => void;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
  onCustomCssChange: (css: string) => void;
  onAssistantApply: (markdown: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function WorkspaceShell({
  settings,
  lang,
  theme,
  resolvedTheme,
  translations: t,
  fileInputRef,
  onFileChange,
  isImporting,
  importStep,
  noticeMessage,
  markdown,
  draft,
  activeDraft,
  previewPending,
  editorMode,
  activeView,
  template,
  resumeTheme,
  projects,
  currentProject,
  canvasRef,
  editorContainerRef,
  previewContainerRef,
  scale,
  zoomPercent,
  onImportClick,
  onLanguageToggle,
  onThemeToggle,
  onUpdateProvider,
  onSetActiveProvider,
  onThemeChange,
  onThemeReset,
  onUpdateSettings,
  onProjectSwitch,
  onProjectCreate,
  onProjectRename,
  onProjectDelete,
  onDraftChange,
  onMarkdownChange,
  onFormatMarkdown,
  onEditorModeChange,
  onTemplateChange,
  onActiveViewChange,
  onZoomChange,
  onZoomReset,
  onCustomCssChange,
  onAssistantApply,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: WorkspaceShellProps) {
  const [assistantProject, setAssistantProject] = useState<string | null>(null);
  useIdlePreload(assistantPreloads);
  const resetCustomCss = useCallback(() => onCustomCssChange(''), [onCustomCssChange]);
  return (
    <>
      <main
        className={`app-ui flex h-dvh w-full items-center justify-center overflow-hidden font-sans transition-colors duration-200 sm:p-4 md:p-8 ${
          resolvedTheme === 'dark' ? 'bg-[var(--app-bg)]' : 'bg-[var(--app-bg)]'
        }`}
      >
        <motion.div
          className="app-shell flex h-full w-full max-w-[1600px] flex-col overflow-hidden border transition-colors duration-200 sm:rounded-xl"
          initial="hidden"
          animate="visible"
          variants={slideUpVariants}
        >
          <ErrorBoundary lang={lang}>
            <AppHeader
              fileInputRef={fileInputRef}
              onFileChange={onFileChange}
              isImporting={isImporting}
              importStep={importStep}
              lang={lang}
              theme={theme}
              resolvedTheme={resolvedTheme}
              translations={t}
              canvasRef={canvasRef}
              draft={draft}
              markdown={markdown}
              onImportClick={onImportClick}
              onLanguageToggle={onLanguageToggle}
              onThemeToggle={onThemeToggle}
              settings={settings}
              onUpdateProvider={onUpdateProvider}
              onSetActiveProvider={onSetActiveProvider}
              resumeTheme={resumeTheme}
              onThemeChange={onThemeChange}
              onThemeReset={onThemeReset}
              template={template}
              onUpdateSettings={onUpdateSettings}
              projects={projects}
              currentProject={currentProject}
              onProjectSwitch={onProjectSwitch}
              onProjectCreate={onProjectCreate}
              onProjectRename={onProjectRename}
              onProjectDelete={onProjectDelete}
            />
          </ErrorBoundary>

          <ImportNoticeBanner message={noticeMessage} />

          <div className="relative flex flex-1 overflow-hidden bg-[var(--app-bg)]">
            <div className={`${activeView === 'editor' ? 'flex' : 'hidden'} w-full lg:flex lg:w-[44%] xl:w-[41%] 2xl:w-[39%]`}>
              <ErrorBoundary lang={lang}>
                <EditorPane
                  containerRef={editorContainerRef}
                  draft={draft}
                  editorMode={editorMode}
                  lang={lang}
                  isImporting={isImporting}
                  markdown={markdown}
                  translations={t}
                  onDraftChange={onDraftChange}
                  onEditorModeChange={onEditorModeChange}
                  onMarkdownChange={onMarkdownChange}
                  onFormatMarkdown={onFormatMarkdown}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={onUndo}
                  onRedo={onRedo}
                />
              </ErrorBoundary>
            </div>

            <div className={`${activeView === 'preview' ? 'flex' : 'hidden'} w-full lg:flex lg:min-w-0 lg:flex-1`}>
              <ErrorBoundary lang={lang}>
                <PreviewPane
                  containerRef={previewContainerRef}
                  draft={activeDraft}
                  pending={previewPending}
                  resumeRef={canvasRef}
                  scale={scale}
                  template={template}
                  theme={resumeTheme}
                  translations={t}
                  zoomPercent={zoomPercent}
                  lang={lang}
                  onTemplateChange={onTemplateChange}
                  onZoomChange={onZoomChange}
                  onZoomReset={onZoomReset}
                  onCustomCssChange={onCustomCssChange}
                  onCustomCssReset={resetCustomCss}
                  currentFont={resumeTheme.fontFamily}
                />
              </ErrorBoundary>
            </div>
          </div>

          <MobileViewToggle
            activeView={activeView}
            translations={t}
            onChange={onActiveViewChange}
          />
        </motion.div>
      </main>

      <ErrorBoundary lang={lang}>
        {assistantProject === null ? <div className="app-ui ui-floating-tools pointer-events-none fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-end print:hidden sm:inset-x-auto sm:bottom-6 sm:right-6">
          <button id="assistant-launcher" type="button" aria-label={t.assistantOpen}
            className="app-primary pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full"
            onClick={() => setAssistantProject(currentProject?.id ?? 'default-project')}><Bot size={22} /></button>
        </div> : <>
          <AssistantWidget
            key={currentProject?.id ?? 'default-project'}
            initiallyOpen={assistantProject === (currentProject?.id ?? 'default-project')}
            lang={lang}
            markdown={markdown}
            projectId={currentProject?.id ?? 'default-project'}
            settings={settings}
            translations={t}
            onApplyMarkdown={onAssistantApply}
            onUpdateProvider={onUpdateProvider}
            onSetActiveProvider={onSetActiveProvider}
            onUpdateSettings={onUpdateSettings}
          />
        </>}
      </ErrorBoundary>
    </>
  );
}
