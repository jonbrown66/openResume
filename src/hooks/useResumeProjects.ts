import { useState, useCallback, useEffect, useRef } from 'react';
import type { ResumeProject, StorageSchema } from '@/types/resumeProject';
import { STORAGE_KEY, generateId } from '@/types/resumeProject';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { defaultMarkdownEn } from '@/constants';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';
import { isResumeDraft, normalizeTheme } from '@/utils/validation';

function defaultProject(language: 'zh' | 'en' = 'zh'): ResumeProject {
  return { id: generateId(), name: language === 'en' ? 'Resume 1' : '我的简历1', data: parseMarkdownToResumeDraft(defaultMarkdownEn),
    markdown: defaultMarkdownEn, theme: { ...DEFAULT_THEME_CONFIG }, layout: {}, templateId: 'classic',
    createdAt: Date.now(), updatedAt: Date.now() };
}
function load(language: 'zh' | 'en') {
  const fallback = defaultProject(language);
  const empty = { projects: [fallback], currentProjectId: fallback.id };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Assistant history needs a stable project ID even before the first resume edit.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
      return { data: empty, error: '' };
    }
    try {
      const parsed = JSON.parse(raw) as StorageSchema;
      if (!Array.isArray(parsed.projects) || !parsed.projects.length || !parsed.projects.every(p =>
        p && typeof p.id === 'string' && typeof p.name === 'string' && isResumeDraft(p.data) &&
        (p.markdown === undefined || typeof p.markdown === 'string'))) throw new Error('Invalid project storage');
      if (new Set(parsed.projects.map(p => p.id)).size !== parsed.projects.length) throw new Error('Duplicate project IDs');
      return { data: { projects: parsed.projects.map(p => ({ ...p, theme: normalizeTheme(p.theme),
        templateId: ['classic', 'minimal', 'standard', 'sidebar'].includes(p.templateId) ? p.templateId : 'classic',
      })), currentProjectId: parsed.projects.some(p => p.id === parsed.currentProjectId) ? parsed.currentProjectId : parsed.projects[0].id } as StorageSchema, error: '' };
    } catch {
      // Preserve the original bytes before allowing a fresh workspace to be saved.
      const recoveryKey = `${STORAGE_KEY}-recovery-${Date.now()}`;
      localStorage.setItem(recoveryKey, raw);
      if (localStorage.getItem(recoveryKey) !== raw) throw new Error('Recovery backup failed');
      return { data: empty, error: 'recovered' };
    }
  } catch {
    return { data: empty, error: 'unavailable' };
  }
}
export function useResumeProjects(language: 'zh' | 'en' = 'zh') {
  const [initial] = useState(() => load(language));
  const [storageData, setStorageData] = useState<StorageSchema>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const latest = useRef(storageData);
  const mustBackup = useRef(initial.error === 'unavailable');
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!dirty.current) return;
    try {
      if (mustBackup.current) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const key = `${STORAGE_KEY}-recovery-${Date.now()}`;
          localStorage.setItem(key, raw);
          if (localStorage.getItem(key) !== raw) throw new Error('Backup failed');
        }
        mustBackup.current = false;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current));
      dirty.current = false;
      setStorageError('');
      setSaveState('saved');
    } catch { setStorageError('save-failed'); }
  }, []);
  const commit = useCallback((data: StorageSchema, batch = false) => {
    latest.current = data;
    setStorageData(data);
    dirty.current = true;
    setSaveState('saving');
    // Bound the save delay even during continuous typing or slider dragging.
    if (!batch) flush();
    else if (saveTimer.current === null) saveTimer.current = setTimeout(flush, 250);
  }, [flush]);
  useEffect(() => {
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, [flush]);
  const currentProject = storageData.projects.find(p => p.id === storageData.currentProjectId) ?? storageData.projects[0];
  const createProject = useCallback((copyFrom?: string) => {
    const previous = latest.current;
    const source = previous.projects.find(p => p.id === copyFrom);
    const project = defaultProject(language);
    const number = Math.max(0, ...previous.projects.map(p => Number(p.name.match(/^(?:我的简历|Resume )(\d+)$/)?.[1]) || 0)) + 1;
    project.name = language === 'en' ? `Resume ${number}` : `我的简历${number}`;
    if (source) Object.assign(project, { data: structuredClone(source.data), markdown: source.markdown,
      theme: { ...source.theme }, templateId: source.templateId });
    commit({ projects: [...previous.projects, project], currentProjectId: project.id });
    return project;
  }, [commit, language]);
  const switchProject = useCallback((id: string) => {
    if (latest.current.projects.some(p => p.id === id)) commit({ ...latest.current, currentProjectId: id });
  }, [commit]);
  const updateProject = useCallback((id: string, updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>) => {
    const previous = latest.current;
    const project = previous.projects.find(p => p.id === id);
    if (!project || Object.entries(updates).every(([key, value]) => {
      const previous = project[key as keyof ResumeProject];
      return Object.is(previous, value) || (typeof value === 'object' && typeof previous === 'object' && JSON.stringify(previous) === JSON.stringify(value));
    })) return;
    commit({ ...previous, projects: previous.projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p) }, !('name' in updates));
  }, [commit]);
  const deleteProject = useCallback((id: string) => {
    const previous = latest.current;
    if (previous.projects.length <= 1) return;
    const projects = previous.projects.filter(p => p.id !== id);
    commit({ projects, currentProjectId: previous.currentProjectId === id ? projects[0].id : previous.currentProjectId });
  }, [commit]);
  const renameProject = useCallback((id: string, name: string) => {
    if (name.trim()) updateProject(id, { name: name.trim() });
  }, [updateProject]);
  return { projects: storageData.projects, currentProject, createProject, switchProject,
    updateProject, deleteProject, renameProject, storageError, saveState };
}
