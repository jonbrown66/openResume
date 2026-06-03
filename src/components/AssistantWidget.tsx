import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot } from 'lucide-react';

import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantConversationList } from '@/components/assistant/AssistantConversationList';
import { AssistantHeader } from '@/components/assistant/AssistantHeader';
import { SettingsModal } from '@/components/SettingsModal';
import { useToast } from '@/components/ui/Toast';
import type { AppSettings, ApiProviderId } from '@/config/settings';
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
  onUpdateProvider?: (id: ApiProviderId, updates: Record<string, string>) => void;
  onSetActiveProvider?: (id: ApiProviderId) => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
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
  onUpdateProvider = () => undefined,
  onSetActiveProvider = () => undefined,
  onUpdateSettings = () => undefined,
}: AssistantWidgetProps) {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showLauncher, setShowLauncher] = useState(true);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { messages, setMessages } = useAssistantMemory(projectId);

  const activeProvider = settings.providers[settings.activeProvider];
  const providerModel = activeProvider.model.trim();
  const hasApiKey = Boolean(activeProvider.apiKey.trim());
  const hasModel = Boolean(providerModel);
  const needsAiConfig = !hasApiKey || !hasModel;
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

    if (!hasApiKey) {
      addToast(t.assistantMissingApiKey, 'warning');
      setIsSettingsOpen(true);
      return;
    }

    if (!hasModel) {
      addToast(t.assistantMissingModel, 'warning');
      setIsSettingsOpen(true);
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

  const providerLabel = needsAiConfig
    ? t.assistantAiNotConfigured
    : `${activeProvider.name} · ${providerModel}`;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-end print:hidden sm:inset-x-auto sm:bottom-6 sm:right-6">
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
            role="dialog"
            aria-modal="false"
            aria-label={t.assistantTitle}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="app-panel pointer-events-auto flex h-[min(720px,calc(100dvh-5.5rem))] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[22px] border shadow-[0_18px_60px_-28px_rgba(40,52,25,0.45)] sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[min(540px,calc(100vw-2rem))] sm:rounded-[24px]"
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
              providerLabel={providerLabel}
              memoryHint={t.assistantMemoryHint}
              configureLabel={needsAiConfig ? t.assistantConfigureAi : undefined}
              placeholder={t.assistantInputPlaceholderEdit}
              sendLabel={t.assistantSend}
              isSubmitting={isSubmitting}
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onConfigure={() => setIsSettingsOpen(true)}
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
          className="app-primary pointer-events-auto ml-auto inline-flex h-14 w-14 items-center justify-center rounded-full transition-colors"
        >
          <Bot size={22} />
        </motion.button>
      ) : null}
      </div>

      {isSettingsOpen ? (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          lang={lang}
          onUpdateProvider={onUpdateProvider}
          onSetActiveProvider={onSetActiveProvider}
          onUpdateSettings={onUpdateSettings}
        />
      ) : null}
    </>
  );
}
