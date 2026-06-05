import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ActiveView, EditorMode, ResumeTemplate } from '@/config/ui';
import { defaultMarkdownEn } from '@/constants';
import { useCanvasScale } from '@/hooks/useCanvasScale';
import type { ResumeDraft } from '@/types/resume';
import { DEFAULT_THEME_CONFIG, type ResumeThemeConfig } from '@/types/theme';
import { formatResumeMarkdown, parseMarkdownToResumeDraft, serializeResumeDraftToMarkdown } from '@/utils/resumeDocument';
import type { ResumeProject } from '@/types/resumeProject';

interface UseResumeWorkspaceStateOptions {
  currentProject: ResumeProject | undefined;
  updateProject: (
    id: string,
    updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>,
  ) => void;
}

function isSameTheme(
  left: ResumeThemeConfig,
  right: ResumeThemeConfig,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

export function useResumeWorkspaceState({
  currentProject,
  updateProject,
}: UseResumeWorkspaceStateOptions) {
  const [markdown, setMarkdown] = useState(defaultMarkdownEn);
  const [draft, setDraft] = useState(() => parseMarkdownToResumeDraft(defaultMarkdownEn));
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown');
  const [resumeTheme, setResumeTheme] = useState<ResumeThemeConfig>(
    currentProject?.theme ?? DEFAULT_THEME_CONFIG,
  );

  // Undo and Redo stacks for markdown changes
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastUndoPushRef = useRef<{ value: string; time: number }>({ value: defaultMarkdownEn, time: 0 });

  const pushMarkdownToUndo = useCallback((currentVal: string) => {
    setUndoStack((prev) => {
      const nextStack = [...prev, currentVal];
      return nextStack.length > 50 ? nextStack.slice(1) : nextStack;
    });
    setRedoStack([]);
  }, []);

  const setMarkdownWithHistory = useCallback((nextVal: string | ((prev: string) => string)) => {
    setMarkdown((prevMarkdown) => {
      const resolvedNext = typeof nextVal === 'function' ? nextVal(prevMarkdown) : nextVal;
      if (resolvedNext === prevMarkdown) {
        return prevMarkdown;
      }

      const now = Date.now();
      if (
        (now - lastUndoPushRef.current.time > 1500 ||
         Math.abs(resolvedNext.length - lastUndoPushRef.current.value.length) > 10) &&
        prevMarkdown !== lastUndoPushRef.current.value
      ) {
        setUndoStack((prev) => {
          const nextStack = [...prev, prevMarkdown];
          return nextStack.length > 50 ? nextStack.slice(1) : nextStack;
        });
        setRedoStack([]);
        lastUndoPushRef.current = { value: prevMarkdown, time: now };
      }

      return resolvedNext;
    });
  }, []);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const markdownDraftCache = useRef<ResumeDraft | null>(null);
  const lastMarkdownRef = useRef<string>(markdown);
  const debouncedMarkdown = useDebouncedValue(markdown, 180);

  const handleEditorModeChange = useCallback((newMode: EditorMode) => {
    if (newMode === 'blocks' && editorMode === 'markdown') {
      setDraft(parseMarkdownToResumeDraft(markdown));
    } else if (newMode === 'markdown' && editorMode === 'blocks') {
      setMarkdown(serializeResumeDraftToMarkdown(draft));
    }

    setEditorMode(newMode);
  }, [draft, editorMode, markdown]);

  const { scale, zoomPercent, resetZoom, updateZoom } = useCanvasScale(previewContainerRef);

  const activeDraft = useMemo(() => {
    if (editorMode === 'blocks') {
      return draft;
    }

    if (markdownDraftCache.current && markdown === lastMarkdownRef.current) {
      return markdownDraftCache.current;
    }

    if (markdownDraftCache.current && debouncedMarkdown === lastMarkdownRef.current) {
      return markdownDraftCache.current;
    }

    const parsed = parseMarkdownToResumeDraft(debouncedMarkdown);
    markdownDraftCache.current = parsed;
    lastMarkdownRef.current = debouncedMarkdown;
    return parsed;
  }, [debouncedMarkdown, draft, editorMode]);

  const updateTheme = useCallback((newConfig: Partial<ResumeThemeConfig>) => {
    setResumeTheme((previousTheme) => ({ ...previousTheme, ...newConfig }));
  }, []);

  const resetTheme = useCallback(() => {
    setResumeTheme(DEFAULT_THEME_CONFIG);
  }, []);

  const updateCustomCss = useCallback((css: string) => {
    setResumeTheme((previousTheme) => ({ ...previousTheme, customCss: css }));
  }, []);

  const handleAssistantApply = useCallback((nextMarkdown: string) => {
    if (nextMarkdown === markdown) return;
    pushMarkdownToUndo(markdown);

    const parsed = parseMarkdownToResumeDraft(nextMarkdown);
    markdownDraftCache.current = parsed;
    lastMarkdownRef.current = nextMarkdown;
    setMarkdown(nextMarkdown);
    setDraft(parsed);
    
    lastUndoPushRef.current = { value: nextMarkdown, time: Date.now() };
  }, [markdown, pushMarkdownToUndo]);

  const handleImportComplete = useCallback((nextMarkdown: string) => {
    if (nextMarkdown === markdown) return;
    pushMarkdownToUndo(markdown);

    setMarkdown(nextMarkdown);
    setDraft(parseMarkdownToResumeDraft(nextMarkdown));
    setActiveView('editor');
    setEditorMode('markdown');

    lastUndoPushRef.current = { value: nextMarkdown, time: Date.now() };
  }, [markdown, pushMarkdownToUndo]);

  const handleFormatMarkdown = useCallback(() => {
    const nextMarkdown = formatResumeMarkdown(markdown);
    if (nextMarkdown === markdown) return;
    
    pushMarkdownToUndo(markdown);

    const parsed = parseMarkdownToResumeDraft(nextMarkdown);
    markdownDraftCache.current = parsed;
    lastMarkdownRef.current = nextMarkdown;
    setMarkdown(nextMarkdown);
    setDraft(parsed);

    lastUndoPushRef.current = { value: nextMarkdown, time: Date.now() };
  }, [markdown, pushMarkdownToUndo]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevMarkdown = undoStack[undoStack.length - 1];

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, markdown]);

    const parsed = parseMarkdownToResumeDraft(prevMarkdown);
    markdownDraftCache.current = parsed;
    lastMarkdownRef.current = prevMarkdown;
    setMarkdown(prevMarkdown);
    setDraft(parsed);

    lastUndoPushRef.current = { value: prevMarkdown, time: Date.now() };
  }, [undoStack, markdown]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextMarkdown = redoStack[redoStack.length - 1];

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, markdown]);

    const parsed = parseMarkdownToResumeDraft(nextMarkdown);
    markdownDraftCache.current = parsed;
    lastMarkdownRef.current = nextMarkdown;
    setMarkdown(nextMarkdown);
    setDraft(parsed);

    lastUndoPushRef.current = { value: nextMarkdown, time: Date.now() };
  }, [redoStack, markdown]);

  useEffect(() => {
    if (debouncedMarkdown !== markdown) {
      return;
    }

    if (currentProject) {
      const currentProjectMarkdown = serializeResumeDraftToMarkdown(currentProject.data);
      if (currentProjectMarkdown !== debouncedMarkdown) {
        updateProject(currentProject.id, { data: parseMarkdownToResumeDraft(debouncedMarkdown) });
      }
    }
  }, [currentProject, debouncedMarkdown, markdown, updateProject]);

  useEffect(() => {
    if (currentProject && currentProject.templateId !== template) {
      updateProject(currentProject.id, { templateId: template });
    }
  }, [currentProject, template, updateProject]);

  useEffect(() => {
    if (currentProject && !isSameTheme(currentProject.theme, resumeTheme)) {
      updateProject(currentProject.id, { theme: resumeTheme });
    }
  }, [currentProject, resumeTheme, updateProject]);

  useEffect(() => {
    if (currentProject) {
      const nextMarkdown = serializeResumeDraftToMarkdown(currentProject.data);
      markdownDraftCache.current = currentProject.data;
      lastMarkdownRef.current = nextMarkdown;
      setMarkdown(nextMarkdown);
      setDraft(currentProject.data);
      setTemplate(currentProject.templateId);
      setResumeTheme(currentProject.theme);
    }
  }, [currentProject?.id]);

  return {
    markdown,
    setMarkdown: setMarkdownWithHistory,
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
    editorContainerRef,
    previewContainerRef,
    resumeRef,
    scale,
    zoomPercent,
    resetZoom,
    updateZoom,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    onUndo: handleUndo,
    onRedo: handleRedo,
  };
}
