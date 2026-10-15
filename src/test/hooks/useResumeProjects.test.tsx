import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useResumeProjects } from '@/hooks/useResumeProjects';
import { STORAGE_KEY } from '@/types/resumeProject';

describe('useResumeProjects', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('does not bump updatedAt when updateProject receives identical data', () => {
    const { result } = renderHook(() => useResumeProjects());

    const currentProject = result.current.currentProject;
    const initialUpdatedAt = currentProject.updatedAt;

    act(() => {
      result.current.updateProject(currentProject.id, {
        data: currentProject.data,
        templateId: currentProject.templateId,
        theme: currentProject.theme,
      });
    });

    expect(result.current.currentProject.updatedAt).toBe(initialUpdatedAt);
  });
  it('saves the final edit synchronously before the next project operation', () => {
    const { result } = renderHook(() => useResumeProjects());
    act(() => result.current.renameProject(result.current.currentProject.id, 'Saved immediately'));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).projects[0].name).toBe('Saved immediately');
  });
  it('keeps the initial project identity across reloads before editing', () => {
    const first = renderHook(() => useResumeProjects()); const id = first.result.current.currentProject.id;
    first.unmount();
    const second = renderHook(() => useResumeProjects());
    expect(second.result.current.currentProject.id).toBe(id);
  });
  it('preserves damaged storage in a recovery copy', () => {
    const raw = '{broken storage'; localStorage.setItem(STORAGE_KEY, raw);
    const { result } = renderHook(() => useResumeProjects());
    expect(result.current.storageError).toBe('recovered');
    const key = Object.keys(localStorage).find(key => key.startsWith(`${STORAGE_KEY}-recovery-`));
    expect(localStorage.getItem(key!)).toBe(raw); expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
});
