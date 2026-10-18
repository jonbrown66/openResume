import { describe, expect, it } from 'vitest';
import { getAssistantTasks, resolveAssistantMode } from '@/utils/assistantTasks';
describe('assistant tasks', () => {
  it.each(['How can I improve this resume?', 'Can you give me advice?', '有什么优化建议？', '请先提供建议，不修改简历', '优化建议', '请分析岗位匹配情况'])('keeps consultation advisory: %s', text => expect(resolveAssistantMode(text)).toBe('chat'));
  it.each(['Rewrite the summary', 'Polish this resume', 'Apply those changes', '请润色经历', '优化这份简历', '按你刚才的建议修改'])('creates candidates for explicit edits: %s', text => expect(resolveAssistantMode(text)).toBe('edit'));
  it.each(['zh', 'en'] as const)('routes all prepared %s tasks consistently', lang => {
    for (const task of getAssistantTasks(lang)) expect(resolveAssistantMode(task.prompt)).toBe(task.id === 'polish' ? 'edit' : 'chat');
  });
});
