import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as resumeDocument from '@/utils/resumeDocument';

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
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('does not transfer old positional types to a replacement Markdown document', () => {
    const { result } = renderHook(() => useResumeWorkspaceState({ currentProject: createProject(), updateProject: vi.fn() }));
    act(() => result.current.setMarkdown('---\nname: New\n---\n\n## 教育经历\n\n### 本科\n**大学**\n\n## 项目经历\n\n### 新项目\n- 开发'));
    act(() => result.current.handleEditorModeChange('blocks'));
    expect(result.current.draft.sections.map(section => section.type)).toEqual(['education', 'project']);
  });

  it('persists a renamed section type across mode changes, reload and history', () => {
    const project = createProject();
    const updateProject = vi.fn();
    const { result, unmount } = renderHook(() => useResumeWorkspaceState({ currentProject: project, updateProject }));
    const original = result.current.draft;
    act(() => result.current.setDraft({ ...original, sections: original.sections.map((section, i) => i ? section : { ...section, title: '技能' }) }));
    expect(result.current.draft.sections[0].type).toBe('experience');
    act(() => result.current.handleEditorModeChange('markdown'));
    act(() => result.current.setMarkdown(result.current.markdown.replace('## 技能', '## 自定义标题')));
    act(() => result.current.handleEditorModeChange('blocks'));
    expect(result.current.draft.sections[0].type).toBe('experience');
    act(() => result.current.onUndo());
    expect(result.current.draft.sections[0]).toMatchObject({ title: '技能', type: 'experience' });
    act(() => result.current.onRedo());
    const persisted = { ...project, ...updateProject.mock.lastCall?.[1] };
    unmount();
    const reloaded = renderHook(() => useResumeWorkspaceState({ currentProject: persisted, updateProject: vi.fn() }));
    expect(reloaded.result.current.draft.sections[0]).toMatchObject({ title: '自定义标题', type: 'experience' });
  });

  it('updates and persists raw input immediately, parsing only the latest revision', () => {
    vi.useFakeTimers();
    const updateProject = vi.fn();
    const project = createProject();
    const parse = vi.spyOn(resumeDocument, 'parseMarkdownToResumeDraft');
    const { result } = renderHook(() => useResumeWorkspaceState({ currentProject: project, updateProject }));
    const previous = result.current.draft;
    parse.mockClear();
    act(() => result.current.setMarkdown('---\nname: First\n---\n\n## Skills\n- React'));
    act(() => result.current.setMarkdown('---\nname: Latest\n---\n\n## Skills\n- React'));
    expect(result.current.markdown).toContain('Latest');
    expect(result.current.draft).toBe(previous);
    expect(result.current.previewPending).toBe(true);
    expect(updateProject.mock.lastCall?.[1]).toMatchObject({ markdown: result.current.markdown });
    expect(updateProject.mock.lastCall?.[1]).not.toHaveProperty('data');
    expect(parse).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(80));
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.current.draft.frontmatter.name).toBe('Latest');
    expect(result.current.previewPending).toBe(false);
    expect(updateProject.mock.lastCall?.[1].data.frontmatter.name).toBe('Latest');
  });

  it('never applies a pending parse to a newly selected project', () => {
    vi.useFakeTimers();
    const updateProject = vi.fn();
    const { result, rerender } = renderHook(({ project }) => useResumeWorkspaceState({ currentProject: project, updateProject }),
      { initialProps: { project: createProject() } });
    act(() => result.current.setMarkdown('Old pending edit'));
    rerender({ project: { ...createProject(), id: 'project-2', markdown: 'New project' } });
    updateProject.mockClear();
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.markdown).toBe('New project');
    expect(result.current.canUndo).toBe(false);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('keeps an IME composition together and delays preview until confirmation', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResumeWorkspaceState({ currentProject: createProject(), updateProject: vi.fn() }));
    const original = result.current.markdown;
    const draft = result.current.draft;
    act(() => result.current.setMarkdown('拼', { group: 'ime-1', composing: true }));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.setMarkdown('拼音', { group: 'ime-1', composing: true }));
    expect(result.current.draft).toBe(draft);
    act(() => result.current.setMarkdown('拼音', { group: 'ime-1', composing: false }));
    act(() => vi.advanceTimersByTime(80));
    expect(result.current.previewPending).toBe(false);
    act(() => result.current.onUndo());
    expect(result.current.markdown).toBe(original);
    expect(result.current.canUndo).toBe(false);
  });

  it('separates fast edits in different fields and isolates structural deletion', () => {
    const { result } = renderHook(() => useResumeWorkspaceState({ currentProject: createProject(), updateProject: vi.fn() }));
    const original = result.current.markdown;
    act(() => result.current.setMarkdown('Field one', { group: 'field-one' }));
    act(() => result.current.setMarkdown('Field two', { group: 'field-two' }));
    act(() => result.current.onUndo());
    expect(result.current.markdown).toBe('Field one');
    act(() => result.current.onUndo());
    expect(result.current.markdown).toBe(original);
    const draft = result.current.draft;
    const edited = { ...draft, frontmatter: { ...draft.frontmatter, name: 'Typed name' } };
    act(() => result.current.setDraft(edited));
    act(() => result.current.setDraft({ ...edited, sections: edited.sections.slice(1) }));
    act(() => result.current.onUndo());
    expect(result.current.draft.frontmatter.name).toBe('Typed name');
    expect(result.current.draft.sections).toHaveLength(edited.sections.length);
    act(() => result.current.onRedo());
    expect(result.current.draft.sections).toHaveLength(edited.sections.length - 1);
  });

  it('flushes pending content when entering blocks and reuses untouched sections', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResumeWorkspaceState({ currentProject: createProject(), updateProject: vi.fn() }));
    const sections = result.current.draft.sections;
    act(() => result.current.setMarkdown(result.current.markdown.replace(/name: .*/, 'name: Immediate name')));
    act(() => result.current.handleEditorModeChange('blocks'));
    expect(result.current.draft.frontmatter.name).toBe('Immediate name');
    expect(result.current.previewPending).toBe(false);
    result.current.draft.sections.forEach((section, i) => expect(section).toBe(sections[i]));
    act(() => vi.advanceTimersByTime(80));
    expect(result.current.draft.frontmatter.name).toBe('Immediate name');
  });
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
