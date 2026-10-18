import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResumeProjects } from '@/hooks/useResumeProjects';
import { STORAGE_KEY } from '@/types/resumeProject';

describe('useResumeProjects', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('batches rapid edits while keeping the latest in-memory content immediately', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResumeProjects());
    const save = vi.spyOn(Storage.prototype, 'setItem');
    const id = result.current.currentProject.id;
    for (let index = 0; index < 20; index++) {
      act(() => result.current.updateProject(id, { markdown: `Edit ${index}` }));
    }
    expect(result.current.currentProject.markdown).toBe('Edit 19');
    expect(save).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(250));
    expect(save).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).projects[0].markdown).toBe('Edit 19');
  });

  it('flushes pending content before a project switch without overwriting the next project', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResumeProjects());
    const first = result.current.currentProject.id;
    act(() => result.current.createProject());
    const second = result.current.currentProject.id;
    act(() => result.current.updateProject(second, { markdown: 'Second final edit' }));
    act(() => result.current.switchProject(first));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.currentProjectId).toBe(first);
    expect(saved.projects.find((p: { id: string }) => p.id === second).markdown).toBe('Second final edit');
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.currentProject.id).toBe(first);
  });

  it.each(['pagehide', 'visibilitychange', 'unmount'])('flushes the last edit on %s', event => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useResumeProjects());
    act(() => result.current.updateProject(result.current.currentProject.id, { markdown: 'Last keystroke' }));
    act(() => {
      if (event === 'unmount') unmount();
      else if (event === 'visibilitychange') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event(event));
      } else window.dispatchEvent(new Event(event));
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).projects[0].markdown).toBe('Last keystroke');
  });

  it('keeps unsaved edits and retries after storage becomes available', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResumeProjects());
    const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('Quota exceeded'); });
    act(() => result.current.updateProject(result.current.currentProject.id, { markdown: 'Keep this edit' }));
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.storageError).toBe('save-failed');
    expect(result.current.currentProject.markdown).toBe('Keep this edit');
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.storageError).toBe('');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).projects[0].markdown).toBe('Keep this edit');
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
