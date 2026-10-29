import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultMarkdownEn, defaultMarkdownZh } from '@/constants';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { ResumeRenderer } from '@/components/ResumeRenderer';

describe('ResumeRenderer', () => {
  it('lays out descriptive skills consistently when Markdown lines are wrapped', () => {
    const skill = '精通产品需求分析与规格书评审，擅长制定系统级测试计划、设计高覆盖率测试用例，独立主导功能、性能、兼容性测试及核心版本回归。';
    const { container, rerender } = render(<ResumeRenderer markdown={`---\nname: 测试用户\n---\n\n## 专业技能\n\n- ${skill}`} theme={DEFAULT_THEME_CONFIG} />);
    expect(container.querySelector('ul')).toHaveClass('skills-list-detailed');
    const wrapped = skill.match(/.{1,18}/g)!.join('\n  ');
    rerender(<ResumeRenderer markdown={`---\nname: 测试用户\n---\n\n## 专业技能\n\n- ${wrapped}`} theme={DEFAULT_THEME_CONFIG} />);
    expect(container.querySelector('ul')).toHaveClass('skills-list-detailed');
  });

  it('keeps short keywords compact and classified descriptions in a reading column', () => {
    const { container, rerender } = render(<ResumeRenderer markdown={'---\nname: 测试用户\n---\n\n## 技能\n\n- React\n- TypeScript'} theme={DEFAULT_THEME_CONFIG} />);
    expect(container.querySelector('ul')).not.toHaveClass('skills-list-detailed');
    rerender(<ResumeRenderer markdown={'---\nname: 测试用户\n---\n\n## 技能\n\n- **测试设计：** 制定系统级测试计划'} theme={DEFAULT_THEME_CONFIG} />);
    expect(container.querySelector('ul')).toHaveClass('skills-list-detailed');
  });

  it('renders plain skill lines as a list without requiring Markdown bullets', () => {
    const { container } = render(<ResumeRenderer markdown={'---\nname: 测试用户\n---\n\n## 技能\n\nReact\nTypeScript'} theme={DEFAULT_THEME_CONFIG} />);
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('localizes the sidebar contact heading from resume content', () => {
    const { rerender } = render(<ResumeRenderer markdown={defaultMarkdownZh} template="sidebar" theme={DEFAULT_THEME_CONFIG} />);
    expect(screen.getByRole('heading', { name: '联系方式' })).toBeInTheDocument();
    rerender(<ResumeRenderer markdown={defaultMarkdownEn} template="sidebar" theme={DEFAULT_THEME_CONFIG} />);
    expect(screen.getByRole('heading', { name: 'CONTACT' })).toBeInTheDocument();
  });

  it('renders from markdown input', () => {
    render(<ResumeRenderer markdown={defaultMarkdownEn} template="classic" theme={DEFAULT_THEME_CONFIG} />);

    expect(screen.getByText((_, element) => element?.textContent === 'EMMA SANCHEZ')).toBeInTheDocument();
    expect(screen.getByText('WORK EXPERIENCE')).toBeInTheDocument();
  });

  it('hides avatar container when no image is provided in frontmatter', () => {
    const markdownWithoutImage = `---
name: JOHN DOE
title: Software Engineer
---

## EXPERIENCE
`;
    const { container } = render(
      <ResumeRenderer markdown={markdownWithoutImage} template="standard" theme={DEFAULT_THEME_CONFIG} />
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.resume-header')).toHaveClass('no-avatar');
  });

  it('renders avatar image when image is provided in frontmatter', () => {
    const markdownWithImage = `---
name: JOHN DOE
title: Software Engineer
image: https://example.com/avatar.jpg
---

## EXPERIENCE
`;
    const { container } = render(
      <ResumeRenderer markdown={markdownWithImage} template="standard" theme={DEFAULT_THEME_CONFIG} />
    );

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(container.querySelector('.resume-header')).toHaveClass('has-avatar');
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
