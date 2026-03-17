import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { translations } from '../config/ui';
import { defaultMarkdownZh } from '../constants';
import { parseMarkdownToResumeDraft } from '../utils/resumeDocument';
import { BlockEditor } from './BlockEditor';

describe('BlockEditor', () => {
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
