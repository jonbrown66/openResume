import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resumeMarkdownExamples } from '@/config/markdownGuide';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';

describe('beginner Markdown examples', () => {
  it.each(['zh', 'en'] as const)('parses the %s example into the intended resume structure', lang => {
    const draft = parseMarkdownToResumeDraft(resumeMarkdownExamples[lang]);
    expect(draft.frontmatter.name).toBe(lang === 'zh' ? '张三' : 'Alex Chen');
    expect(draft.summary).toContain(lang === 'zh' ? '3 年' : '3 years');
    expect(draft.sections).toHaveLength(3);
    const job = draft.sections[0].entries[0];
    expect(job.heading).toBe(lang === 'zh' ? '前端工程师' : 'Frontend Engineer');
    expect(job.organization).toBe(lang === 'zh' ? '示例科技' : 'Example Studio');
    expect(job.meta).toBe(lang === 'zh' ? '2023.06 - 至今' : 'Jun 2023 - Present');
    expect(job.content).toContain('**30%**');
    expect(draft.sections[1].entries[0].organization).toBe(lang === 'zh' ? '示例大学' : 'Example University');
    expect(draft.sections[2].content).toContain('(https://example.com)');
  });
  it('keeps the documented full example identical to the in-app Chinese example', () => {
    const doc = readFileSync(resolve(process.cwd(), 'docs/resume-markdown.md'), 'utf8');
    expect(doc).toContain('\n' + resumeMarkdownExamples.zh + '```');
  });
});
