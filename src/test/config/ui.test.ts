import { describe, expect, it } from 'vitest';

import { translations } from '@/config/ui';

describe('translations', () => {
  it('keeps the core chinese assistant copy readable', () => {
    expect(translations.zh.settingsTitle).toBe('设置');
    expect(translations.zh.assistantSingleIntro).toBe('我是您的简历修改助手，有什么可以帮您');
    expect(translations.zh.assistantMemoryHint).toBe('仅保留最近 20 条对话记录');
  });
});
