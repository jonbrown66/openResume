import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { translations } from '@/config/ui';
import { defaultMarkdownZh } from '@/constants';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { BlockEditor } from '@/components/BlockEditor';
import { useResumeWorkspaceState } from '@/hooks/useResumeWorkspaceState';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';

describe('BlockEditor', () => {
  it('records inline restoration in global undo/redo without replacing later edits or duplicating entries', () => {
    const project = { id: 'test', name: 'Test', data: parseMarkdownToResumeDraft(defaultMarkdownZh), theme: DEFAULT_THEME_CONFIG, layout: {}, templateId: 'classic' as const, createdAt: 1, updatedAt: 1 };
    function Workspace() {
      const workspace = useResumeWorkspaceState({ currentProject: project, updateProject: vi.fn() });
      return <><button onClick={workspace.onUndo}>全局撤销</button><button onClick={workspace.onRedo}>全局重做</button><BlockEditor draft={workspace.draft} lang="zh" translations={translations.zh} onChange={workspace.setDraft} /></>;
    }
    render(<Workspace />);
    const work = within(screen.getByRole('region', { name: '工作经历' }));
    const count = work.getAllByRole('group').length;
    fireEvent.click(work.getByRole('button', { name: '删除工作经历第1条' }));
    fireEvent.click(screen.getByRole('button', { name: '全局撤销' }));
    expect(work.getAllByRole('group')).toHaveLength(count);
    expect(screen.queryByRole('button', { name: '撤销删除' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全局重做' }));
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '保留编辑' } });
    fireEvent.click(screen.getByRole('button', { name: '撤销删除' }));
    expect(work.getAllByRole('group')).toHaveLength(count);
    expect(screen.getByLabelText('姓名')).toHaveValue('保留编辑');
    fireEvent.click(screen.getByRole('button', { name: '全局撤销' }));
    expect(work.getAllByRole('group')).toHaveLength(count - 1);
    expect(screen.getByLabelText('姓名')).toHaveValue('保留编辑');
    fireEvent.click(screen.getByRole('button', { name: '全局重做' }));
    expect(work.getAllByRole('group')).toHaveLength(count);
  });

  it('keeps simple sections as a single list, with folding and ordering on entries that do not exist', () => {
    const onChange = vi.fn();
    render(<BlockEditor draft={parseMarkdownToResumeDraft(defaultMarkdownZh)} lang="zh" translations={translations.zh} onChange={onChange} />);
    const skill = within(screen.getByRole('region', { name: '专业技能' }));
    expect(skill.getByLabelText('技能清单')).toBeInTheDocument();
    expect(skill.queryByRole('button', { name: '添加分组' })).not.toBeInTheDocument();
    expect(skill.queryByRole('button', { name: '新经历' })).not.toBeInTheDocument();
    const sectionToggle = skill.getByRole('button', { name: '专业技能' });
    fireEvent.click(sectionToggle);
    expect(sectionToggle).toHaveAttribute('aria-expanded', 'false');
    expect(skill.getByLabelText('技能清单')).not.toBeVisible();
    const work = within(screen.getByRole('region', { name: '工作经历' }));
    fireEvent.click(work.getByRole('button', { name: '下移工作经历第1条' }));
    expect(onChange.mock.lastCall?.[0].sections[0].entries[0].heading).toBe('人事与行政专员');
  });

  it('keeps the section form type on rename and restores only deleted content', () => {
    const onChange = vi.fn();
    render(<BlockEditor draft={parseMarkdownToResumeDraft(defaultMarkdownZh)} lang="zh" translations={translations.zh} onChange={onChange} />);
    const work = within(screen.getByRole('region', { name: '工作经历' }));
    const company = work.getAllByLabelText('公司')[0];
    const role = work.getAllByLabelText('职位')[0];
    fireEvent.change(company, { target: { value: '真实公司' } });
    fireEvent.change(role, { target: { value: '真实职位' } });
    expect(work.getByRole('button', { name: /真实公司 · 真实职位 ·/ })).toBeInTheDocument();
    fireEvent.change(work.getByLabelText('章节名称'), { target: { value: '技能' } });
    expect(work.getAllByLabelText('公司')[0]).toHaveValue('真实公司');
    fireEvent.click(work.getByRole('button', { name: '删除技能第1条' }));
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '后续编辑' } });
    fireEvent.click(screen.getByRole('button', { name: '撤销删除' }));
    expect(onChange.mock.lastCall?.[0].frontmatter.name).toBe('后续编辑');
    expect(onChange.mock.lastCall?.[0].sections[0]).toMatchObject({ title: '技能', type: 'experience' });
    expect(work.getAllByLabelText('公司')[0]).toHaveValue('真实公司');
    fireEvent.click(work.getByRole('button', { name: '删除章节：技能' }));
    fireEvent.change(screen.getByLabelText('个人简介'), { target: { value: '后续简介' } });
    fireEvent.click(screen.getByRole('button', { name: '撤销删除' }));
    expect(onChange.mock.lastCall?.[0].summary).toBe('后续简介');
    expect(screen.getByRole('region', { name: '技能' })).toBeInTheDocument();
  });

  it('adds a clearly named section without inserting placeholder resume content', async () => {
    const onChange = vi.fn();
    render(<BlockEditor draft={parseMarkdownToResumeDraft(defaultMarkdownZh)} lang="zh" translations={translations.zh} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: '添加章节' }));
    const option = await screen.findByRole('option', { name: '项目经历' });
    fireEvent.pointerDown(option, { pointerType: 'mouse' });
    fireEvent.click(option, { detail: 1 });
    expect(onChange.mock.lastCall?.[0].sections.at(-1)).toMatchObject({ title: '项目经历', content: '', entries: [] });
  });
  it('labels education correctly and keeps simple skills free of company and date fields', () => {
    const draft = parseMarkdownToResumeDraft('---\nname: Test\ntitle: Engineer\n---\n\n## 教育经历\n\n### 计算机科学 | 2020 - 2024\n**示例大学**\n\n## 技能\n\n- React');
    render(<BlockEditor draft={draft} lang="zh" translations={translations.zh} onChange={vi.fn()} />);
    expect(screen.getByLabelText('学校')).toHaveValue('示例大学');
    expect(screen.getByLabelText('专业 / 学历')).toHaveValue('计算机科学');
    expect(screen.getByLabelText('技能清单')).toHaveValue('- React');
    expect(screen.getAllByLabelText('时间')).toHaveLength(1);
    expect(screen.queryByLabelText('公司')).not.toBeInTheDocument();
  });
  it('updates frontmatter and summary through structured inputs', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownZh);
    const onChange = vi.fn();

    render(<BlockEditor draft={draft} lang="zh" translations={translations.zh} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '李四' } });
    fireEvent.change(screen.getByLabelText('个人简介'), { target: { value: '新的简介' } });

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0]?.[0].frontmatter.name).toBe('李四');
    expect(onChange.mock.lastCall?.[0].summary).toBe('新的简介');
  });
});
