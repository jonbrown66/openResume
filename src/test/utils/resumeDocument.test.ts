import { describe, expect, it } from 'vitest';

import { defaultMarkdownEn, defaultMarkdownZh } from '@/constants';
import {
  formatResumeMarkdown,
  parseMarkdownToResumeDraft,
  serializeResumeDraftToMarkdown,
} from '@/utils/resumeDocument';

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

  it('does not emit empty level-three headings for untitled section content', () => {
    const markdown = `---
name: 张三
title: 行政主管
---

## 专业技能

- 办公室行政与运营管理
- 标准作业流程（SOP）设计与优化
- 预算编制与成本控制
`;

    const draft = parseMarkdownToResumeDraft(markdown);
    const serialized = serializeResumeDraftToMarkdown(draft);

    expect(serialized).toContain('## 专业技能');
    expect(serialized).toContain('- 办公室行政与运营管理');
    expect(serialized).not.toMatch(/^###\s*$/m);
  });

  it('parses a plain markdown resume header without frontmatter for live preview', () => {
    const markdown = `
# 辛俊榜
**高级软件测试工程师** · 8年经验 · Android系统测试
8年测试经验 | xinjunbang@gmail.com | 13435399520

## 个人简介
拥有 8 年软件测试经验，长期负责 Android 系统测试、功能测试与质量保障。
`.trim();

    const draft = parseMarkdownToResumeDraft(markdown);

    expect(draft.frontmatter.name).toBe('辛俊榜');
    expect(draft.frontmatter.title).toBe('高级软件测试工程师 · 8年经验 · Android系统测试');
    expect(draft.frontmatter.contact).toBe('13435399520 | xinjunbang@gmail.com');
    expect(draft.summary).toContain('8 年软件测试经验');
  });

  it('formats resume markdown by removing body separators and normalizing summary bullets', () => {
    const markdown = `
---
name: 辛俊榜
title: 高级软件测试工程师 · 8年经验 · Android系统测试
contact: 13435399520 | xinjunbang@gmail.com
---

## 个人简介

- 8年软件测试经验，专注Android系统级测试与自动化测试工程。
---

## 技能特长

- 测试策略与质量体系: 测试策略制定 · 需求分析与用例设计
---

## 工作经历

### Android系统模块测试负责人 | 2022-04 - 2025-12
**Realme移动通讯有限公司（软通动力）**
- 负责手机项目Android系统模块的测试管理与质量交付
`.trim();

    const formatted = formatResumeMarkdown(markdown);

    expect(formatted).toContain('name: 辛俊榜');
    expect(formatted).toContain('## 个人简介\n\n8年软件测试经验');
    expect(formatted).toContain('## 技能特长');
    expect(formatted).toContain('- 测试策略与质量体系');
    expect(formatted).toContain('### Android系统模块测试负责人 | 2022-04 - 2025-12');
    expect(formatted.match(/^---$/gm)).toHaveLength(2);
  });

  it('moves meta from a bold education detail line into the entry header', () => {
    const markdown = `---
name: 辛俊榜
title: 高级软件测试工程师
---

## 教育背景

### 河源职业技术学院
**专科 · 软件技术** | 2015/9 - 2018/6 | 河源
- 主修课程：JAVA程序设计、数据库技术、软件测试技术
`;

    const draft = parseMarkdownToResumeDraft(markdown);
    const formatted = formatResumeMarkdown(markdown);

    expect(draft.sections[0].entries[0]).toMatchObject({
      heading: '河源职业技术学院',
      organization: '专科 · 软件技术',
      meta: '2015/9 - 2018/6 | 河源',
    });
    expect(formatted).toContain('### 河源职业技术学院 | 2015/9 - 2018/6 | 河源');
    expect(formatted).toContain('**专科 · 软件技术**');
  });

  it('formats common company-first and school-first resume fields into renderer-friendly entries', () => {
    const markdown = `---
name: 辛俊榜
title: 高级软件测试工程师
---

## 工作经历

Realme移动通讯有限公司（软通动力） | Android系统模块测试负责人 | 2022-04 - 2025-12 | 深圳
- 负责手机项目Android系统模块的测试管理与质量交付

## 教育背景

河源职业技术学院 | 专科 · 软件技术 | 2015/9 - 2018/6 | 河源
- 主修课程：JAVA程序设计、数据库技术、软件测试技术
`;

    const formatted = formatResumeMarkdown(markdown);

    expect(formatted).toContain('### Android系统模块测试负责人 | 2022-04 - 2025-12 | 深圳');
    expect(formatted).toContain('**Realme移动通讯有限公司（软通动力）**');
    expect(formatted).toContain('### 专科 · 软件技术 | 2015/9 - 2018/6 | 河源');
    expect(formatted).toContain('**河源职业技术学院**');
  });

  it('keeps markdown formatting idempotent for skills sections', () => {
    const markdown = `---
name: 辛俊榜
title: 高级软件测试工程师
---

## 技能特长

- 测试策略与质量体系: 测试策略制定 · 需求分析与用例设计
- 自动化测试工程: Appium · uiautomator · pytest
`;

    const once = formatResumeMarkdown(markdown);
    const twice = formatResumeMarkdown(once);

    expect(once).toBe(twice);
    expect(twice).not.toContain('技能概览');
  });
});
