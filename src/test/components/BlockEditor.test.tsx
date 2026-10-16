import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { translations } from '@/config/ui';
import { defaultMarkdownZh } from '@/constants';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { BlockEditor } from '@/components/BlockEditor';

describe('BlockEditor', () => {
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
