import { useState, useEffect, useCallback, useRef } from 'react';
import type { ResumeProject, StorageSchema } from '@/types/resumeProject';
import { STORAGE_KEY, generateId } from '@/types/resumeProject';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { defaultMarkdownEn } from '@/constants';
import type { ResumeDraft } from '@/types/resume';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';

const DEFAULT_DRAFT: ResumeDraft = parseMarkdownToResumeDraft(defaultMarkdownEn);

function getDefaultProject(): ResumeProject {
  return {
    id: generateId(),
    name: '我的简历1',
    data: { ...DEFAULT_DRAFT },
    theme: { ...DEFAULT_THEME_CONFIG },
    layout: {},
    templateId: 'classic',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadFromStorage(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultProject = getDefaultProject();
      return { projects: [defaultProject], currentProjectId: defaultProject.id };
    }
    const parsed = JSON.parse(raw) as StorageSchema;
    if (!parsed.projects?.length) {
      const defaultProject = getDefaultProject();
      return { projects: [defaultProject], currentProjectId: defaultProject.id };
    }
    return parsed;
  } catch {
    const defaultProject = getDefaultProject();
    return { projects: [defaultProject], currentProjectId: defaultProject.id };
  }
}

function saveToStorage(data: StorageSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function isSameProjectValue<T>(currentValue: T, nextValue: T) {
  if (typeof currentValue === 'object' && currentValue !== null) {
    return JSON.stringify(currentValue) === JSON.stringify(nextValue);
  }

  return currentValue === nextValue;
}

export function useResumeProjects() {
  const [storageData, setStorageData] = useState<StorageSchema>(() => loadFromStorage());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(storageData);
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storageData]);

  const immediateSave = useCallback((data: StorageSchema) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveToStorage(data);
  }, []);

  const currentProject = storageData.projects.find(
    p => p.id === storageData.currentProjectId
  ) ?? storageData.projects[0];

  const createProject = useCallback((copyFrom?: string) => {
    const existingNames = storageData.projects
      .map(p => p.name)
      .filter(name => /^我的简历\d+$/.test(name));
    
    let nextNum = 1;
    if (existingNames.length > 0) {
      const nums = existingNames
        .map(name => parseInt(name.replace('我的简历', ''), 10))
        .filter(n => !isNaN(n));
      nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    }
    const newName = `我的简历${nextNum}`;

    let newData: ResumeDraft = { ...DEFAULT_DRAFT };
    if (copyFrom) {
      const source = storageData.projects.find(p => p.id === copyFrom);
      if (source) {
        newData = { ...source.data };
      }
    }

    const newProject: ResumeProject = {
      id: generateId(),
      name: newName,
      data: newData,
      theme: { ...DEFAULT_THEME_CONFIG },
      layout: {},
      templateId: 'classic',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newStorageData: StorageSchema = {
      projects: [...storageData.projects, newProject],
      currentProjectId: newProject.id,
    };
    immediateSave(newStorageData);
    setStorageData(newStorageData);
    return newProject;
  }, [storageData, immediateSave]);

  const switchProject = useCallback((id: string) => {
    const newData: StorageSchema = {
      ...storageData,
      currentProjectId: id,
    };
    immediateSave(newData);
    setStorageData(newData);
  }, [storageData, immediateSave]);

  const updateProject = useCallback((id: string, updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>) => {
    setStorageData(prev => {
      let hasChanges = false;

      const newProjects = prev.projects.map(p => {
        if (p.id !== id) {
          return p;
        }

        const changedEntries = Object.entries(updates).filter(([key, value]) => {
          const projectKey = key as keyof typeof updates & keyof ResumeProject;
          return !isSameProjectValue(p[projectKey], value as ResumeProject[typeof projectKey]);
        });

        if (changedEntries.length === 0) {
          return p;
        }

        hasChanges = true;
        return { ...p, ...updates, updatedAt: Date.now() };
      });

      return hasChanges ? { ...prev, projects: newProjects } : prev;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    if (storageData.projects.length <= 1) {
      return;
    }
    const newProjects = storageData.projects.filter(p => p.id !== id);
    const newCurrentId = storageData.currentProjectId === id
      ? newProjects[0]?.id ?? null
      : storageData.currentProjectId;
    
    const newData: StorageSchema = {
      projects: newProjects,
      currentProjectId: newCurrentId,
    };
    immediateSave(newData);
    setStorageData(newData);
  }, [storageData, immediateSave]);

  const renameProject = useCallback((id: string, newName: string) => {
    updateProject(id, { name: newName });
  }, [updateProject]);

  return {
    projects: storageData.projects,
    currentProject,
    createProject,
    switchProject,
    updateProject,
    deleteProject,
    renameProject,
  };
}
