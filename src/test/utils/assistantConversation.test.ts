import { describe, expect, it } from 'vitest';

import {
  buildAssistantConversation,
  buildAssistantHint,
} from '@/utils/assistantConversation';

describe('assistantConversation', () => {
  it('returns the assistant hint when there are no persisted messages', () => {
    const hint = buildAssistantHint('I am your resume editing assistant. How can I help you?');

    expect(buildAssistantConversation([], hint)).toEqual([hint]);
  });

  it('returns persisted messages as the conversation when history exists', () => {
    const hint = buildAssistantHint('hint');
    const messages = [
      {
        id: 'user-1',
        role: 'user' as const,
        content: 'Rewrite the summary.',
      },
    ];

    expect(buildAssistantConversation(messages, hint)).toEqual(messages);
  });
});
