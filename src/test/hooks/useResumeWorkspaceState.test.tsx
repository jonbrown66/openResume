import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultMarkdownZh } from '@/constants';
import { useResumeWorkspaceState } from '@/hooks/useResumeWorkspaceState';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import type { ResumeProject } from '@/types/resumeProject';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';

function createProject(): ResumeProject {
  return {
    id: 'project-1',
    name: '我的简历',
    data: parseMarkdownToResumeDraft(defaultMarkdownZh),
    theme: { ...DEFAULT_THEME_CONFIG },
    layout: {},
    templateId: 'classic',
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('useResumeWorkspaceState', () => {
  it('does not fall into a recursive update loop when project writes back into currentProject', async () => {
    const updateProjectCalls: Array<Partial<Omit<ResumeProject, 'id' | 'createdAt'>>> = [];

    const { result } = renderHook(() => {
      const [currentProject, setCurrentProject] = React.useState(createProject());

      const updateProject = (
        _id: string,
        updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>,
      ) => {
        updateProjectCalls.push(updates);
        if (updateProjectCalls.length > 3) {
          throw new Error('recursive update loop');
        }

        setCurrentProject((previousProject) => ({
          ...previousProject,
          ...updates,
          updatedAt: previousProject.updatedAt + 1,
        }));
      };

      return useResumeWorkspaceState({
        currentProject,
        updateProject,
      });
    });

    await waitFor(() => {
      expect(result.current.markdown.length).toBeGreaterThan(0);
    });

    expect(updateProjectCalls.length).toBeLessThanOrEqual(1);
  });

  it('does not keep syncing the same project when only the object reference changes', () => {
    const updateProject = vi.fn();
    const project = createProject();

    const { rerender } = renderHook(
      ({ currentProject }) =>
        useResumeWorkspaceState({
          currentProject,
          updateProject,
        }),
      {
        initialProps: {
          currentProject: project,
        },
      },
    );

    const initialCallCount = updateProject.mock.calls.length;

    rerender({
      currentProject: {
        ...project,
        updatedAt: project.updatedAt + 1,
      },
    });

    expect(updateProject).toHaveBeenCalledTimes(initialCallCount);
  });
});
