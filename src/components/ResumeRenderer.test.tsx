import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultMarkdownEn } from '../constants';
import { parseMarkdownToResumeDraft } from '../utils/resumeDocument';
import { ResumeRenderer } from './ResumeRenderer';

describe('ResumeRenderer', () => {
  it('renders from markdown input', () => {
    render(<ResumeRenderer markdown={defaultMarkdownEn} template="classic" />);

    expect(screen.getByText((_, element) => element?.textContent === 'EMMASANCHEZ')).toBeInTheDocument();
    expect(screen.getByText('WORK EXPERIENCE')).toBeInTheDocument();
  });

  it('renders from draft input without requiring markdown', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownEn);

    render(<ResumeRenderer draft={draft} template="minimal" />);

    expect(screen.getByText('Administrative Manager')).toBeInTheDocument();
    expect(screen.getAllByText('Arowwai Industries')).toHaveLength(2);
    expect(screen.getByText('SKILLS')).toBeInTheDocument();
  });
});
