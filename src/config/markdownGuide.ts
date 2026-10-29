import type { AppLanguage } from './ui';

export const resumeMarkdownExamples: Record<AppLanguage, string> = {
  zh: `---
name: 张三
title: 前端工程师
contact: zhangsan@example.com | 138-0000-0000 | 杭州
---

## 个人简介

有 3 年前端开发经验，擅长把复杂流程做得简单易用。

## 工作经历

### 前端工程师 | 2023.06 - 至今
**示例科技**
- 负责官网与管理后台开发，页面加载时间减少 **30%**。
- 与设计、产品协作，完成核心流程优化。

## 教育经历

### 计算机科学与技术 | 2019.09 - 2023.06
**示例大学**
- 本科，主修软件工程、数据结构。

## 技能

- React、TypeScript、CSS
- [作品集](https://example.com)
`,
  en: `---
name: Alex Chen
title: Frontend Engineer
contact: alex@example.com | +1 555 0100 | Seattle
---

## Summary

Frontend engineer with 3 years of experience making complex workflows easier to use.

## Work Experience

### Frontend Engineer | Jun 2023 - Present
**Example Studio**
- Built the website and admin dashboard, reducing load time by **30%**.
- Worked with design and product to simplify core workflows.

## Education

### Computer Science | Sep 2019 - Jun 2023
**Example University**
- Bachelor’s degree; studied software engineering and data structures.

## Skills

- React, TypeScript, CSS
- [Portfolio](https://example.com)
`,
};

export const markdownGuideRows: Record<AppLanguage, { syntax: string; effect: string; note: string }[]> = {
  zh: [
    { syntax: 'name: 张三\ntitle: 前端工程师\ncontact: 邮箱 | 电话 | 城市', effect: '姓名、求职岗位、联系方式', note: '放在文件最上方的两行 --- 之间；字段名用英文，冒号用半角，值不用加引号。' },
    { syntax: '## 工作经历', effect: '章节标题', note: '两个 # 后留一个空格。教育经历、项目经历、技能也用这一层级。' },
    { syntax: '### 前端工程师 | 2023.06 - 至今', effect: '条目标题与时间', note: '三个 # 表示一条经历；最后一个半角 | 后的内容作为时间或补充信息，位置由模板决定。' },
    { syntax: '### 前端工程师 | 2023.06 - 至今\n**示例科技**', effect: '公司或学校名称', note: '公司或学校紧跟条目标题下一行，整行用 ** 包住；中间不要插入空行。' },
    { syntax: '- 完成项目交付\n- 加载时间减少 **30%**', effect: '列表描述与成果', note: '每项单独一行，短横线后留空格；不要手工输入装饰性圆点。' },
    { syntax: '**重点** / *补充说明*', effect: '加粗 / 斜体', note: '适用于正文；章节和条目标题本身已有层级样式，不必再套加粗符号。' },
    { syntax: '[作品集](https://example.com)', effect: '可点击的文字链接', note: '建议放在正文或列表中。顶部 contact 是纯文本，不解析这一写法。' },
    { syntax: '第一段。\n\n第二段。', effect: '两个段落', note: '段落间空一行。普通单次换行不保证显示为独立段落，不要靠反复回车制造分页。' },
    { syntax: '| 技能 | 熟练度 |\n| --- | --- |\n| React | 熟练 |', effect: '表格', note: '表头下的分隔行必需。手机和窄栏中容易拥挤，简单技能清单优先用列表。' },
  ],
  en: [
    { syntax: 'name: Alex Chen\ntitle: Frontend Engineer\ncontact: Email | Phone | City', effect: 'Name, role and contact details', note: 'Place these between two --- lines at the very top. Keep English field names, use a colon and do not wrap values in quotes.' },
    { syntax: '## Work Experience', effect: 'Section heading', note: 'Leave a space after ##. Use this level for education, projects and skills too.' },
    { syntax: '### Frontend Engineer | Jun 2023 - Present', effect: 'Entry heading and dates', note: '### starts an entry. Text after the last | becomes dates or metadata; placement depends on the template.' },
    { syntax: '### Frontend Engineer | Jun 2023 - Present\n**Example Studio**', effect: 'Company or school', note: 'Put the whole bold line immediately after the entry heading, with no blank line between them.' },
    { syntax: '- Delivered the project\n- Reduced load time by **30%**', effect: 'Bullet points and achievements', note: 'One item per line, with a space after the hyphen. Avoid typing decorative bullet characters.' },
    { syntax: '**Key point** / *Additional detail*', effect: 'Bold / italic', note: 'Use in body text. Section and entry headings already have their own styles.' },
    { syntax: '[Portfolio](https://example.com)', effect: 'Clickable text link', note: 'Use in body text or lists. The contact field at the top is plain text, not Markdown.' },
    { syntax: 'First paragraph.\n\nSecond paragraph.', effect: 'Separate paragraphs', note: 'Leave one blank line between paragraphs. A single line break may be joined; repeated blank lines are not page breaks.' },
    { syntax: '| Skill | Level |\n| --- | --- |\n| React | Proficient |', effect: 'Table', note: 'Keep the separator row below the header. Prefer lists for simple skills on narrow pages.' },
  ],
};
