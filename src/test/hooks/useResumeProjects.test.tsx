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
});
