import type { AssistantMessage } from '@/hooks/useAssistantMemory';

export function buildAssistantHint(content: string): AssistantMessage {
  return {
    id: 'assistant-hint',
    role: 'assistant',
    content,
  };
}

export function buildAssistantConversation(
  messages: AssistantMessage[],
  hint: AssistantMessage,
) {
  return messages.length > 0 ? messages : [hint];
}
