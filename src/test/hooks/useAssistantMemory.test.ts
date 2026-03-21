import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

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
});
