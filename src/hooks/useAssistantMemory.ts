import { useCallback, useEffect, useState } from 'react';

import type { ResumeDiffResult } from '@/utils/resumeDiff';

const STORAGE_KEY_PREFIX = 'openresume-assistant-memory-v1';
export const ASSISTANT_MEMORY_LIMIT = 20;

export interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  proposedMarkdown?: string;
  applied?: boolean;
  diff?: ResumeDiffResult;
  riskWarnings?: string[];
}

interface PersistedAssistantMemory {
  messages: AssistantMessage[];
}

function getStorageKey(projectId: string) {
  return `${STORAGE_KEY_PREFIX}:${projectId}`;
}

function trimAssistantMessages(messages: AssistantMessage[]) {
  if (messages.length <= ASSISTANT_MEMORY_LIMIT) {
    return messages;
  }

  return messages.slice(-ASSISTANT_MEMORY_LIMIT);
}

function toPersistedMessage(message: AssistantMessage): AssistantMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
  };
}

function normalizeMessage(raw: unknown): AssistantMessage | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    (candidate.role !== 'assistant' && candidate.role !== 'user') ||
    typeof candidate.content !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    role: candidate.role,
    content: candidate.content,
    proposedMarkdown:
      typeof candidate.proposedMarkdown === 'string' ? candidate.proposedMarkdown : undefined,
    applied: typeof candidate.applied === 'boolean' ? candidate.applied : undefined,
    diff: candidate.diff && typeof candidate.diff === 'object'
      ? (candidate.diff as ResumeDiffResult)
      : undefined,
    riskWarnings: Array.isArray(candidate.riskWarnings)
      ? candidate.riskWarnings.filter((item): item is string => typeof item === 'string')
      : undefined,
  };
}

function loadAssistantMemory(projectId: string): AssistantMessage[] {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PersistedAssistantMemory;
    if (!Array.isArray(parsed.messages)) {
      return [];
    }

    return trimAssistantMessages(
      parsed.messages
        .map((message) => normalizeMessage(message))
        .filter((message): message is AssistantMessage => Boolean(message)),
    );
  } catch (error) {
    console.error('Failed to load assistant memory from localStorage', error);
    return [];
  }
}

function saveAssistantMemory(projectId: string, messages: AssistantMessage[]) {
  try {
    const trimmedMessages = trimAssistantMessages(messages).map(toPersistedMessage);

    if (trimmedMessages.length === 0) {
      localStorage.removeItem(getStorageKey(projectId));
      return;
    }

    localStorage.setItem(
      getStorageKey(projectId),
      JSON.stringify({ messages: trimmedMessages } satisfies PersistedAssistantMemory),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        localStorage.removeItem(getStorageKey(projectId));
      } catch {
        // Ignore secondary storage failures; the in-memory conversation still works.
      }
      return;
    }
    console.error('Failed to save assistant memory to localStorage', error);
  }
}

export function useAssistantMemory(projectId: string) {
  const [state, setState] = useState(() => ({
    projectId,
    messages: loadAssistantMemory(projectId),
  }));

  const visibleMessages =
    state.projectId === projectId ? state.messages : loadAssistantMemory(projectId);

  useEffect(() => {
    if (state.projectId !== projectId) {
      setState({
        projectId,
        messages: loadAssistantMemory(projectId),
      });
    }
  }, [projectId, state.projectId]);

  useEffect(() => {
    if (state.projectId !== projectId) {
      return;
    }

    saveAssistantMemory(projectId, state.messages);
  }, [projectId, state]);

  const setMessages = useCallback(
    (
      value:
        | AssistantMessage[]
        | ((previousMessages: AssistantMessage[]) => AssistantMessage[]),
    ) => {
      setState((previousState) => {
        const currentMessages =
          previousState.projectId === projectId
            ? previousState.messages
            : loadAssistantMemory(projectId);

        const nextMessages =
          typeof value === 'function' ? value(currentMessages) : value;

        return {
          projectId,
          messages: trimAssistantMessages(nextMessages),
        };
      });
    },
    [projectId],
  );

  return {
    messages: visibleMessages,
    setMessages,
  };
}
