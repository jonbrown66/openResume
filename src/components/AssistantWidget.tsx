import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot } from 'lucide-react';

import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantConversationList } from '@/components/assistant/AssistantConversationList';
import { AssistantHeader } from '@/components/assistant/AssistantHeader';
import { useToast } from '@/components/ui/Toast';
import type { AppSettings } from '@/config/settings';
import type { AppLanguage, TranslationSet } from '@/config/ui';
import { useAssistantMemory, type AssistantMessage } from '@/hooks/useAssistantMemory';
import { buildAssistantConversation, buildAssistantHint } from '@/utils/assistantConversation';
import { requestResumeAssistant } from '@/utils/resumeAssistant';
import { getResumeAssistantRiskWarnings } from '@/utils/resumeAssistantGuard';
import { buildResumeDiff } from '@/utils/resumeDiff';

interface AssistantWidgetProps {
  lang: AppLanguage;
  markdown: string;
  projectId: string;
  settings: AppSettings;
  translations: TranslationSet;
  onApplyMarkdown: (markdown: string) => void;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssistantWidget({
  lang,
  markdown,
  projectId,
  settings,
  translations: t,
  onApplyMarkdown,
}: AssistantWidgetProps) {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showLauncher, setShowLauncher] = useState(true);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { messages, setMessages } = useAssistantMemory(projectId);

  const activeProvider = settings.providers[settings.activeProvider];
  const assistantHint = buildAssistantHint(t.assistantSingleIntro);
  const conversation = buildAssistantConversation(messages, assistantHint);

  const handleApplyProposal = (messageId: string) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target?.proposedMarkdown) {
      return;
    }

    onApplyMarkdown(target.proposedMarkdown);
    setMessages((previousMessages) =>
      previousMessages.map((message) =>
        message.id === messageId ? { ...message, applied: true } : message,
      ),
    );
    addToast(t.assistantApplySuccess, 'success');
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSubmitting) {
      return;
    }

    if (!activeProvider.apiKey.trim()) {
      addToast(t.assistantMissingApiKey, 'warning');
      return;
    }

    if (!activeProvider.model.trim()) {
      addToast(t.assistantMissingModel, 'warning');
      return;
    }

    const userMessage: AssistantMessage = {
      id: createId('user'),
      role: 'user',
      content: trimmedInput,
    };

    setMessages((previousMessages) => [...previousMessages, userMessage]);
    setInput('');
    setIsSubmitting(true);

    try {
      const result = await requestResumeAssistant({
        mode: 'edit',
        userMessage: trimmedInput,
        markdown,
        lang,
        settings,
        history: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const riskWarnings = result.proposedMarkdown
        ? getResumeAssistantRiskWarnings(markdown, result.proposedMarkdown)
        : [];

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: createId('assistant'),
          role: 'assistant',
          content: result.reply,
          proposedMarkdown: result.proposedMarkdown,
          diff: result.proposedMarkdown
            ? buildResumeDiff(markdown, result.proposedMarkdown)
            : undefined,
          riskWarnings,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: createId('assistant-error'),
          role: 'assistant',
          content: `${t.assistantRequestFailed}: ${message}`,
        },
      ]);
      addToast(`${t.assistantRequestFailed}: ${message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpen = () => {
    setShowLauncher(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden sm:bottom-6 sm:right-6">
      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          if (!isOpen) {
            setShowLauncher(true);
          }
        }}
      >
        {isOpen ? (
          <motion.div
            key="assistant-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white/95 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95"
          >
            <AssistantHeader
              title={t.assistantTitle}
              description={t.assistantDescription}
              closeLabel={t.assistantClose}
              onClose={handleClose}
            />
            <AssistantConversationList
              conversation={conversation}
              isSubmitting={isSubmitting}
              translations={t}
              onApplyProposal={handleApplyProposal}
            />
            <AssistantComposer
              providerLabel={`${activeProvider.name} · ${activeProvider.model || t.assistantNoModel}`}
              memoryHint={t.assistantMemoryHint}
              placeholder={t.assistantInputPlaceholderEdit}
              sendLabel={t.assistantSend}
              isSubmitting={isSubmitting}
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showLauncher ? (
        <motion.button
          type="button"
          aria-label={t.assistantOpen}
          onClick={handleOpen}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="ml-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.7)] transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          <Bot size={22} />
        </motion.button>
      ) : null}
    </div>
  );
}
