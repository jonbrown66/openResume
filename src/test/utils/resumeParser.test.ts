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
});
