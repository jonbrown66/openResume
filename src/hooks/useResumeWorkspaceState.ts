import { useCallback, useRef, useState } from 'react';
import type { ActiveView, EditorMode, ResumeTemplate } from '@/config/ui';
import { defaultMarkdownEn } from '@/constants';
import { useCanvasScale } from '@/hooks/useCanvasScale';
import type { ResumeDraft } from '@/types/resume';
import { DEFAULT_THEME_CONFIG, type ResumeThemeConfig } from '@/types/theme';
import { formatResumeMarkdown, parseMarkdownToResumeDraft, serializeResumeDraftToMarkdown } from '@/utils/resumeDocument';
import { withDraftIds } from '@/utils/validation';
import type { ResumeProject } from '@/types/resumeProject';

interface Options {
  currentProject: ResumeProject | undefined;
  updateProject: (id: string, updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>) => void;
}
function loadProject(project?: ResumeProject) {
  const markdown = project?.markdown ?? (project ? serializeResumeDraftToMarkdown(project.data) : defaultMarkdownEn);
  return { projectId: project?.id, markdown,
    draft: withDraftIds(parseMarkdownToResumeDraft(markdown)),
    template: project?.templateId ?? 'classic' as ResumeTemplate,
    theme: project?.theme ?? DEFAULT_THEME_CONFIG,
    undo: [] as string[], redo: [] as string[], lastEdit: 0 };
}
export function useResumeWorkspaceState({ currentProject, updateProject }: Options) {
  const [state, setState] = useState(() => loadProject(currentProject));
  // Replace project content and history together, before children can edit the new project.
  let visible = state;
  if (state.projectId !== currentProject?.id) {
    visible = loadProject(currentProject);
    setState(visible);
  }
  const latest = useRef(visible);
  latest.current = visible;
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const { scale, zoomPercent, resetZoom, updateZoom } = useCanvasScale(previewContainerRef);
  const commit = useCallback((next: typeof state) => {
    latest.current = next;
    setState(next);
    if (next.projectId) updateProject(next.projectId, {
      markdown: next.markdown, data: next.draft, templateId: next.template, theme: next.theme,
    });
  }, [updateProject]);
  const edit = useCallback((markdown: string, draft?: ResumeDraft, separate = false) => {
    const previous = latest.current;
    if (markdown === previous.markdown) return;
    const now = Date.now();
    const checkpoint = separate || now - previous.lastEdit > 1000 || !previous.lastEdit;
    commit({ ...previous, markdown, draft: draft ?? withDraftIds(parseMarkdownToResumeDraft(markdown)),
      undo: checkpoint ? [...previous.undo, previous.markdown].slice(-50) : previous.undo,
      redo: [], lastEdit: now });
  }, [commit]);
  const setMarkdown = useCallback((value: string | ((previous: string) => string)) => {
    edit(typeof value === 'function' ? value(latest.current.markdown) : value);
  }, [edit]);
  const setDraft = useCallback((draft: ResumeDraft) => edit(serializeResumeDraftToMarkdown(draft), withDraftIds(draft)), [edit]);
  const setTemplate = useCallback((template: ResumeTemplate) => commit({ ...latest.current, template }), [commit]);
  const updateTheme = useCallback((config: Partial<ResumeThemeConfig>) => {
    commit({ ...latest.current, theme: { ...latest.current.theme, ...config } });
  }, [commit]);
  const resetTheme = useCallback(() => commit({ ...latest.current, theme: { ...DEFAULT_THEME_CONFIG } }), [commit]);
  const updateCustomCss = useCallback((customCss: string) => updateTheme({ customCss }), [updateTheme]);
  const handleEditorModeChange = useCallback((mode: EditorMode) => setEditorMode(mode), []);
  const handleAssistantApply = useCallback((markdown: string) => edit(markdown, undefined, true), [edit]);
  const handleImportComplete = useCallback((markdown: string) => {
    edit(markdown, undefined, true); setActiveView('editor'); setEditorMode('markdown');
  }, [edit]);
  const handleFormatMarkdown = useCallback(() => edit(formatResumeMarkdown(latest.current.markdown), undefined, true), [edit]);
  const onUndo = useCallback(() => {
    const previous = latest.current; const markdown = previous.undo.at(-1);
    if (markdown === undefined) return;
    commit({ ...previous, markdown, draft: withDraftIds(parseMarkdownToResumeDraft(markdown)),
      undo: previous.undo.slice(0, -1), redo: [...previous.redo, previous.markdown], lastEdit: 0 });
  }, [commit]);
  const onRedo = useCallback(() => {
    const previous = latest.current; const markdown = previous.redo.at(-1);
    if (markdown === undefined) return;
    commit({ ...previous, markdown, draft: withDraftIds(parseMarkdownToResumeDraft(markdown)),
      undo: [...previous.undo, previous.markdown].slice(-50), redo: previous.redo.slice(0, -1), lastEdit: 0 });
  }, [commit]);
  const activeDraft = visible.draft;
  return { markdown: visible.markdown, setMarkdown, draft: visible.draft, setDraft,
    template: visible.template, setTemplate, activeView, setActiveView, editorMode, handleEditorModeChange,
    resumeTheme: visible.theme, updateTheme, resetTheme, updateCustomCss, handleAssistantApply,
    handleImportComplete, handleFormatMarkdown, activeDraft, editorContainerRef, previewContainerRef,
    resumeRef, scale, zoomPercent, resetZoom, updateZoom, canUndo: visible.undo.length > 0,
    canRedo: visible.redo.length > 0, onUndo, onRedo };
}
