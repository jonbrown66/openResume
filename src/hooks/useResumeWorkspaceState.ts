import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ActiveView, EditorMode, ResumeTemplate } from '@/config/ui';
import { defaultMarkdownEn } from '@/constants';
import { useCanvasScale } from '@/hooks/useCanvasScale';
import type { ResumeDraft } from '@/types/resume';
import { DEFAULT_THEME_CONFIG, type ResumeThemeConfig } from '@/types/theme';
import { formatResumeMarkdown, parseMarkdownToResumeDraft, serializeResumeDraftToMarkdown } from '@/utils/resumeDocument';
import { reconcileDraft, withDraftIds } from '@/utils/validation';
import { readEditorSelection, restoreEditorSelection, type EditContext, type EditorSelection } from '@/utils/editingHistory';
import type { ResumeProject } from '@/types/resumeProject';

interface Options {
  currentProject: ResumeProject | undefined;
  updateProject: (id: string, updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>) => void;
}
interface Snapshot { markdown: string; draft: ResumeDraft; draftMarkdown: string; selection?: EditorSelection }
function loadProject(project?: ResumeProject) {
  const markdown = project?.markdown ?? (project ? serializeResumeDraftToMarkdown(project.data) : defaultMarkdownEn);
  return { projectId: project?.id, markdown, draftMarkdown: markdown,
    // Markdown carries explicit section types; legacy documents acquire them once
    // when loaded, then the next block edit serializes them with the content.
    draft: withDraftIds(parseMarkdownToResumeDraft(markdown)),
    template: project?.templateId ?? 'classic' as ResumeTemplate,
    theme: project?.theme ?? DEFAULT_THEME_CONFIG, selection: undefined as EditorSelection | undefined,
    undo: [] as Snapshot[], redo: [] as Snapshot[], lastEdit: 0, group: '', composing: false };
}
function snapshot(state: ReturnType<typeof loadProject>): Snapshot {
  return { markdown: state.markdown, draft: state.draft, draftMarkdown: state.draftMarkdown, selection: state.selection };
}
function structureChanged(previous: ResumeDraft, next: ResumeDraft) {
  return previous.sections.length !== next.sections.length || previous.sections.some((section, i) =>
    section.id !== next.sections[i].id || section.entries.length !== next.sections[i].entries.length ||
    section.entries.some((entry, j) => entry.id !== next.sections[i].entries[j].id));
}
export function useResumeWorkspaceState({ currentProject, updateProject }: Options) {
  const [state, setState] = useState(() => loadProject(currentProject));
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
  const pendingSelection = useRef<{ projectId: string | undefined; selection?: EditorSelection } | null>(null);
  const { scale, zoomPercent, updateZoom } = useCanvasScale(previewContainerRef);
  const commit = useCallback((next: typeof state) => {
    latest.current = next;
    setState(next);
    if (next.projectId) updateProject(next.projectId, {
      markdown: next.markdown, templateId: next.template, theme: next.theme,
      ...(next.draftMarkdown === next.markdown ? { data: next.draft } : {}),
    });
  }, [updateProject]);
  const prepareDraft = useCallback(() => {
    const previous = latest.current;
    if (previous.draftMarkdown === previous.markdown) return previous;
    const next = { ...previous, draft: reconcileDraft(parseMarkdownToResumeDraft(previous.markdown), previous.draft), draftMarkdown: previous.markdown };
    commit(next);
    return next;
  }, [commit]);
  // Persist input immediately; parse only the latest revision after a quiet period.
  useEffect(() => {
    if (visible.composing || visible.markdown === visible.draftMarkdown) return;
    const id = setTimeout(prepareDraft, 80);
    return () => clearTimeout(id);
  }, [visible.projectId, visible.markdown, visible.draftMarkdown, visible.composing, prepareDraft]);
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (!pending) return;
    pendingSelection.current = null;
    if (pending.projectId === visible.projectId) restoreEditorSelection(pending.selection, editorContainerRef.current);
  }, [visible]);

  const edit = useCallback((markdown: string, draft?: ResumeDraft, context: EditContext = {}) => {
    const previous = latest.current;
    if (markdown === previous.markdown) {
      if (previous.composing !== Boolean(context.composing)) commit({ ...previous, composing: Boolean(context.composing) });
      return;
    }
    const selection = readEditorSelection(document.activeElement);
    const group = context.group ?? selection?.key ?? 'markdown';
    const now = Date.now();
    const checkpoint = context.separate || group !== previous.group || (!previous.composing && now - previous.lastEdit > 1000) || !previous.lastEdit;
    const before = { ...snapshot(previous), selection: context.beforeSelection ?? previous.selection ?? selection };
    commit({ ...previous, markdown, draft: draft ?? previous.draft, draftMarkdown: draft ? markdown : previous.draftMarkdown,
      selection, undo: checkpoint ? [...previous.undo, before].slice(-50) : previous.undo,
      redo: [], lastEdit: context.separate ? 0 : now, group, composing: Boolean(context.composing) });
  }, [commit]);
  const setMarkdown = useCallback((value: string | ((previous: string) => string), context?: EditContext) => {
    edit(typeof value === 'function' ? value(latest.current.markdown) : value, undefined, context);
  }, [edit]);
  const setDraft = useCallback((draft: ResumeDraft) => {
    const next = withDraftIds(draft);
    edit(serializeResumeDraftToMarkdown(next), next, { separate: structureChanged(latest.current.draft, next) });
  }, [edit]);
  const setTemplate = useCallback((template: ResumeTemplate) => {
    if (template !== latest.current.template) commit({ ...latest.current, template });
  }, [commit]);
  const updateTheme = useCallback((config: Partial<ResumeThemeConfig>) => {
    if (Object.entries(config).some(([key, value]) => latest.current.theme[key as keyof ResumeThemeConfig] !== value))
      commit({ ...latest.current, theme: { ...latest.current.theme, ...config } });
  }, [commit]);
  const resetTheme = useCallback(() => updateTheme({ ...DEFAULT_THEME_CONFIG }), [updateTheme]);
  const updateCustomCss = useCallback((customCss: string) => updateTheme({ customCss }), [updateTheme]);
  const handleEditorModeChange = useCallback((mode: EditorMode) => {
    if (mode === 'blocks') prepareDraft();
    latest.current = { ...latest.current, lastEdit: 0, group: '' };
    setState(latest.current);
    setEditorMode(mode);
  }, [prepareDraft]);
  const replaceMarkdown = useCallback((markdown: string) => {
    edit(markdown, reconcileDraft(parseMarkdownToResumeDraft(markdown), latest.current.draft), { separate: true });
  }, [edit]);
  const handleAssistantApply = replaceMarkdown;
  const handleImportComplete = useCallback((markdown: string) => {
    replaceMarkdown(markdown); setActiveView('editor'); setEditorMode('markdown');
  }, [replaceMarkdown]);
  const handleFormatMarkdown = useCallback(() => replaceMarkdown(formatResumeMarkdown(latest.current.markdown)), [replaceMarkdown]);
  const navigateHistory = useCallback((direction: 'undo' | 'redo') => {
    const previous = latest.current;
    const target = previous[direction].at(-1);
    if (!target || previous.composing) return;
    const opposite = direction === 'undo' ? 'redo' : 'undo';
    const next = { ...previous, ...target, [direction]: previous[direction].slice(0, -1),
      [opposite]: [...previous[opposite], snapshot(previous)].slice(-50), lastEdit: 0, group: '' };
    if (next.draftMarkdown !== next.markdown) {
      next.draft = reconcileDraft(parseMarkdownToResumeDraft(next.markdown), next.draft);
      next.draftMarkdown = next.markdown;
    }
    pendingSelection.current = { projectId: next.projectId, selection: target.selection };
    commit(next);
  }, [commit]);
  const onUndo = useCallback(() => navigateHistory('undo'), [navigateHistory]);
  const onRedo = useCallback(() => navigateHistory('redo'), [navigateHistory]);
  return { markdown: visible.markdown, setMarkdown, draft: visible.draft, setDraft,
    template: visible.template, setTemplate, activeView, setActiveView, editorMode, handleEditorModeChange,
    resumeTheme: visible.theme, updateTheme, resetTheme, updateCustomCss, handleAssistantApply,
    handleImportComplete, handleFormatMarkdown, activeDraft: visible.draft,
    previewPending: visible.markdown !== visible.draftMarkdown || visible.composing,
    editorContainerRef, previewContainerRef, resumeRef, scale, zoomPercent, updateZoom,
    canUndo: visible.undo.length > 0, canRedo: visible.redo.length > 0, onUndo, onRedo };
}
