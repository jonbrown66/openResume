import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultMarkdownEn } from '@/constants';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { ResumeRenderer } from '@/components/ResumeRenderer';

describe('ResumeRenderer', () => {
  it('renders from markdown input', () => {
    render(<ResumeRenderer markdown={defaultMarkdownEn} template="classic" theme={DEFAULT_THEME_CONFIG} />);

    expect(screen.getByText((_, element) => element?.textContent === 'EMMASANCHEZ')).toBeInTheDocument();
    expect(screen.getByText('WORK EXPERIENCE')).toBeInTheDocument();
  });

  it('renders from draft input without requiring markdown', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownEn);

    render(<ResumeRenderer draft={draft} template="minimal" theme={DEFAULT_THEME_CONFIG} />);

    expect(screen.getByText('Administrative Manager')).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent === ' / Arowwai Industries')).toHaveLength(2);
    expect(screen.getByText('SKILLS')).toBeInTheDocument();
  });

  it('keeps entry title, organization, and date in the same heading row', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownEn);

    render(<ResumeRenderer draft={draft} template="standard" theme={DEFAULT_THEME_CONFIG} />);

    const title = screen.getAllByText('Administrative Assistant')[0];
    const row = title.closest('.resume-h3-split');

    expect(row).toHaveTextContent('Administrative Assistant / Arowwai Industries');
    expect(row).toHaveTextContent('Oct 2023 - Present');
  });

  it('does not force the template to inherit a fixed page minimum height', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownEn);

    const { container } = render(<ResumeRenderer draft={draft} template="standard" theme={DEFAULT_THEME_CONFIG} />);

    expect(container.firstElementChild).toHaveClass('resume-template');
    expect(container.firstElementChild).not.toHaveClass('min-h-[inherit]');
  });

  it('passes custom theme colors to the minimal template', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownEn);
    const theme = {
      ...DEFAULT_THEME_CONFIG,
      primaryColor: '#a9d56b',
      secondaryColor: '#56693f',
    };

    const { container } = render(<ResumeRenderer draft={draft} template="minimal" theme={theme} />);

    expect(container.firstElementChild).toHaveClass('template-minimal');
    expect(container.firstElementChild).toHaveStyle({
      '--primary-color': '#a9d56b',
      '--secondary-color': '#56693f',
    });
  });

  it('renders markdown tables inside a custom wrapper', () => {
    const markdownWithTable = `---
name: JANE DOE
title: Developer
---

## SKILLS

| Skill | Level |
| :--- | :--- |
| React | Expert |
| Node | Intermediate |
`;

    const { container } = render(
      <ResumeRenderer markdown={markdownWithTable} template="classic" theme={DEFAULT_THEME_CONFIG} />
    );

    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    expect(table?.closest('.resume-table-wrapper')).toBeInTheDocument();
    expect(screen.getByText('Skill')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });
});
