import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ASSISTANT_MEMORY_LIMIT,
  useAssistantMemory,
  type AssistantMessage,
} from '@/hooks/useAssistantMemory';

function createMessage(index: number): AssistantMessage {
  return {
    id: `message-${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message content ${index}`,
  };
}

describe('useAssistantMemory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps only the most recent 20 messages', async () => {
    const { result } = renderHook(() => useAssistantMemory('project-limit'));

    act(() => {
      result.current.setMessages(
        Array.from({ length: ASSISTANT_MEMORY_LIMIT + 5 }, (_, index) => createMessage(index + 1)),
      );
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(ASSISTANT_MEMORY_LIMIT);
    });

    expect(result.current.messages[0]?.id).toBe('message-6');
    expect(result.current.messages[ASSISTANT_MEMORY_LIMIT - 1]?.id).toBe('message-25');
  });

  it('persists only lightweight conversation fields', async () => {
    const { result } = renderHook(() => useAssistantMemory('project-lightweight'));

    act(() => {
      result.current.setMessages([
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Here is a proposed revision.',
          proposedMarkdown: '# Very large resume markdown',
          diff: {
            before: [{ text: 'old content', type: 'removed' }],
            after: [{ text: 'new content', type: 'added' }],
          },
          riskWarnings: ['work experience dates changed'],
        },
      ]);
    });

    await waitFor(() => {
      const raw = localStorage.getItem('openresume-assistant-memory-v1:project-lightweight');
      expect(raw).toBeTruthy();
    });

    const saved = JSON.parse(localStorage.getItem('openresume-assistant-memory-v1:project-lightweight') || '{}');
    expect(saved.messages[0]).toEqual({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Here is a proposed revision.',
    });
  });

  it('does not throw when localStorage quota is exceeded', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    const { result } = renderHook(() => useAssistantMemory('project-quota'));

    act(() => {
      result.current.setMessages([createMessage(1)]);
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalled();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(removeItemSpy).toHaveBeenCalledWith('openresume-assistant-memory-v1:project-quota');

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });
});
