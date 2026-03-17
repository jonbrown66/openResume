import { describe, expect, it } from 'vitest';

import { defaultMarkdownEn, defaultMarkdownZh } from '../constants';
import {
  parseMarkdownToResumeDraft,
  serializeResumeDraftToMarkdown,
} from './resumeDocument';

describe('resumeDocument', () => {
  it('parses english markdown into a draft with frontmatter and sections', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownEn);

    expect(draft.frontmatter.name).toBe('EMMA SANCHEZ');
    expect(draft.frontmatter.title).toBe('Administrative Manager');
    expect(draft.summary).toContain('Results-driven Administrative Manager');
    expect(draft.sections).toHaveLength(3);
    expect(draft.sections[0].title).toBe('WORK EXPERIENCE');
    expect(draft.sections[0].entries[0]).toMatchObject({
      heading: 'Administrative Assistant',
      meta: 'Oct 2023 - Present',
      organization: 'Arowwai Industries',
    });
  });

  it('round-trips chinese markdown without mojibake or missing fields', () => {
    const draft = parseMarkdownToResumeDraft(defaultMarkdownZh);
    const serialized = serializeResumeDraftToMarkdown(draft);

    expect(draft.frontmatter.name).toBe('张三');
    expect(draft.frontmatter.title).toBe('高级行政经理');
    expect(draft.sections.some((section) => section.title === '专业技能')).toBe(true);
    expect(serialized).toContain('## 个人简介');
    expect(serialized).toContain('## 专业技能');
    expect(serialized).not.toMatch(/[�]/);
  });

  it('supports a single section document without contact info', () => {
    const markdown = `---
name: Jane Doe
title: Product Designer
---

## PROJECTS

### Resume Studio | 2024 - Present
**Indie**
- Built a polished resume editor.
`;

    const draft = parseMarkdownToResumeDraft(markdown);

    expect(draft.frontmatter.contact).toBe('');
    expect(draft.summary).toBe('');
    expect(draft.sections).toHaveLength(1);
    expect(draft.sections[0].entries[0]).toMatchObject({
      heading: 'Resume Studio',
      meta: '2024 - Present',
      organization: 'Indie',
    });
    expect(serializeResumeDraftToMarkdown(draft)).toContain('### Resume Studio | 2024 - Present');
  });
});
