import { describe, expect, it } from 'vitest';

import { autoFormatResume, parseRawResumeText } from '@/utils/resumeParser';

const rawChineseResume = `
张三
高级行政经理
138-0000-0000
zhangsan@example.com
北京市朝阳区

拥有超过 8 年的行政管理经验，擅长办公室运营、人力资源支持与跨部门协同，能够推动流程优化并提升组织效率。

工作经历
行政主管 | 2023年10月 - 至今
某某科技有限公司
- 负责协调跨部门行政流程优化。
- 组织月度预算与采购管理。

教育背景
行政管理本科 | 2015年9月 - 2019年6月
北京大学
`.trim();

describe('resumeParser', () => {
  it('parses chinese resume text into named sections for local fallback import', () => {
    const draft = parseRawResumeText(rawChineseResume, 'zh');

    expect(draft.summaryTitle).toBe('个人简介');
    expect(draft.summary).toContain('拥有超过 8 年的行政管理经验');
    expect(draft.sections.some((section) => section.title === '工作经历')).toBe(true);
    expect(draft.sections.some((section) => section.title === '教育背景')).toBe(true);
  });

  it('keeps chinese section content when auto-formatting without AI', () => {
    const markdown = autoFormatResume(rawChineseResume, 'zh');

    expect(markdown).toContain('## 个人简介');
    expect(markdown).toContain('## 工作经历');
    expect(markdown).toContain('### 行政主管 | 2023年10月 - 至今');
    expect(markdown).toContain('**某某科技有限公司**');
    expect(markdown).toContain('- 负责协调跨部门行政流程优化。');
    expect(markdown).toContain('## 教育背景');
  });

  it('keeps existing markdown frontmatter and recognizes common chinese resume section aliases', () => {
    const rawMarkdown = `
---
name: 李四
title: 前端开发工程师
contact: lisi@example.com | 138-1111-2222
---

## 个人简介：
5 年前端开发经验，熟悉 React、TypeScript 与工程化，能独立负责复杂业务模块落地。

## 技能特长
React、TypeScript、Next.js、性能优化

## 工作经历项目经历
前端开发工程师 | 2021.06 - 至今
某某科技有限公司
负责简历编辑器、在线预览和导出链路建设。

在线简历平台 | 2022.01 - 2023.12
负责 Markdown 解析、模板渲染和移动端适配。

## 教育背景
计算机科学与技术 | 2016.09 - 2020.06
浙江大学
`.trim();

    const markdown = autoFormatResume(rawMarkdown, 'zh');

    expect(markdown).toContain('name: 李四');
    expect(markdown).toContain('title: 前端开发工程师');
    expect(markdown).toContain('contact: lisi@example.com | 138-1111-2222');
    expect(markdown).toContain('## 个人简介');
    expect(markdown).toContain('## 技能特长');
    expect(markdown).toContain('- React');
    expect(markdown).toContain('- TypeScript');
    expect(markdown).toContain('## 工作经历项目经历');
    expect(markdown).toContain('### 前端开发工程师 | 2021.06 - 至今');
    expect(markdown).toContain('### 在线简历平台 | 2022.01 - 2023.12');
    expect(markdown).toContain('## 教育背景');
  });

  it('extracts markdown heading name, bold title, and contact line from a plain markdown header', () => {
    const rawMarkdown = `
# 辛俊榜
**高级软件测试工程师** · 8年经验 · Android系统测试
8年测试经验 | xinjunbang@gmail.com | 13435399520

## 个人简介
拥有 8 年软件测试经验，长期负责 Android 系统测试、功能测试与质量保障。
`.trim();

    const draft = parseRawResumeText(rawMarkdown, 'zh');
    const markdown = autoFormatResume(rawMarkdown, 'zh');

    expect(draft.frontmatter.name).toBe('辛俊榜');
    expect(draft.frontmatter.title).toBe('高级软件测试工程师 · 8年经验 · Android系统测试');
    expect(draft.frontmatter.contact).toBe('13435399520 | xinjunbang@gmail.com');
    expect(markdown).toContain('name: 辛俊榜');
    expect(markdown).toContain('title: 高级软件测试工程师 · 8年经验 · Android系统测试');
    expect(markdown).toContain('contact: 13435399520 | xinjunbang@gmail.com');
  });

  it('normalizes education detail lines so dates can align to the right', () => {
    const rawMarkdown = `
辛俊榜
高级软件测试工程师

教育背景
河源职业技术学院
**专科 · 软件技术** | 2015/9 - 2018/6 | 河源
- 主修课程：JAVA程序设计、数据库技术、软件测试技术
`.trim();

    const markdown = autoFormatResume(rawMarkdown, 'zh');

    expect(markdown).toContain('### 河源职业技术学院 | 2015/9 - 2018/6 | 河源');
    expect(markdown).toContain('**专科 · 软件技术**');
  });

  it('recognizes company role date descriptors in common resume lines', () => {
    const rawMarkdown = `
辛俊榜
高级软件测试工程师

工作经历
Realme移动通讯有限公司（软通动力） | Android系统模块测试负责人 | 2022-04 - 2025-12 | 深圳
- 负责手机项目Android系统模块的测试管理与质量交付

教育背景
河源职业技术学院 | 专科 · 软件技术 | 2015/9 - 2018/6 | 河源
- 主修课程：JAVA程序设计、数据库技术、软件测试技术
`.trim();

    const markdown = autoFormatResume(rawMarkdown, 'zh');

    expect(markdown).toContain('### Android系统模块测试负责人 | 2022-04 - 2025-12 | 深圳');
    expect(markdown).toContain('**Realme移动通讯有限公司（软通动力）**');
    expect(markdown).toContain('### 专科 · 软件技术 | 2015/9 - 2018/6 | 河源');
    expect(markdown).toContain('**河源职业技术学院**');
  });
});
