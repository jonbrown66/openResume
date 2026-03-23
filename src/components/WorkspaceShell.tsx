import type { ChangeEvent, RefObject } from 'react';
import { motion } from 'framer-motion';

import { AppHeader } from '@/components/AppHeader';
import { AssistantWidget } from '@/components/AssistantWidget';
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
  onMarkdownChange: (markdown: string) => void;
  onEditorModeChange: (mode: EditorMode) => void;
  onTemplateChange: (template: ResumeTemplate) => void;
  onActiveViewChange: (view: ActiveView) => void;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
  onCustomCssChange: (css: string) => void;
  onAssistantApply: (markdown: string) => void;
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
  onEditorModeChange,
  onTemplateChange,
  onActiveViewChange,
  onZoomChange,
  onZoomReset,
  onCustomCssChange,
  onAssistantApply,
}: WorkspaceShellProps) {
  return (
    <>
      <main
        className={`flex h-screen w-full items-center justify-center overflow-hidden font-sans transition-colors duration-200 sm:p-4 md:p-8 ${
          resolvedTheme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100'
        }`}
      >
        <motion.div
          className="flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-zinc-200/60 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-colors duration-200 dark:border-zinc-800/60 dark:bg-zinc-900 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]"
          initial="hidden"
          animate="visible"
          variants={slideUpVariants}
        >
          <ErrorBoundary>
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
              draft={activeDraft}
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

          <div className="relative flex flex-1 overflow-hidden">
            <div className={`${activeView === 'editor' ? 'flex' : 'hidden'} w-full lg:flex`}>
              <ErrorBoundary>
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
                />
              </ErrorBoundary>
            </div>

            <div className={`${activeView === 'preview' ? 'flex' : 'hidden'} w-full lg:flex`}>
              <ErrorBoundary>
                <PreviewPane
                  containerRef={previewContainerRef}
                  draft={activeDraft}
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
                  onCustomCssReset={() => onCustomCssChange('')}
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

      <ErrorBoundary>
        <AssistantWidget
          lang={lang}
          markdown={markdown}
          projectId={currentProject?.id ?? 'default-project'}
          settings={settings}
          translations={t}
          onApplyMarkdown={onAssistantApply}
        />
      </ErrorBoundary>
    </>
  );
}
