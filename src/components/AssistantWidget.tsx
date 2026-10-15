import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useOverlayDialog } from '@/hooks/useOverlayDialog';
import { useCompactViewport } from '@/hooks/useCompactViewport';
import { overlayTransition } from '@/lib/motion';
import { Bot } from 'lucide-react';

import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantConversationList } from '@/components/assistant/AssistantConversationList';
import { AssistantHeader } from '@/components/assistant/AssistantHeader';
import { AiSettings } from '@/components/settings/AiSettings';
import { useToast } from '@/components/ui/Toast';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import type { AppLanguage, TranslationSet } from '@/config/ui';
import { useAssistantMemory, type AssistantMessage } from '@/hooks/useAssistantMemory';
import { buildAssistantConversation, buildAssistantHint } from '@/utils/assistantConversation';
import { requestResumeAssistant } from '@/utils/resumeAssistant';
import { getResumeAssistantRiskWarnings } from '@/utils/resumeAssistantGuard';
import { buildResumeDiff } from '@/utils/resumeDiff';

export interface AssistantWidgetProps {
  initiallyOpen?: boolean;
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
  initiallyOpen = false,
  lang,
  markdown,
  projectId,
  settings,
  translations: t,
  onApplyMarkdown,
  onUpdateProvider = () => undefined,
  onSetActiveProvider = () => undefined,
  onUpdateSettings: _onUpdateSettings = () => undefined,
}: AssistantWidgetProps) {
  const { addToast } = useToast();
  const activeProvider = settings.providers[settings.activeProvider];
  const providerModel = activeProvider.model.trim();
  const hasApiKey = Boolean(activeProvider.apiKey.trim());
  const hasModel = Boolean(providerModel);
  const needsAiConfig = !hasApiKey || !hasModel;

  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [showLauncher, setShowLauncher] = useState(!initiallyOpen);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [widgetView, setWidgetView] = useState<'chat' | 'settings'>('chat');
  const { messages, setMessages } = useAssistantMemory(projectId);

  const panelRef = useRef<HTMLDivElement>(null);
  const compact = useCompactViewport();
  const everOpened = useRef(initiallyOpen);
  useEffect(() => {
    if (!showLauncher || !everOpened.current) return;
    const frame = requestAnimationFrame(() => document.getElementById('assistant-launcher')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [showLauncher]);
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current++; }, [projectId]);



  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-slot="select-content"],[data-overlay-branch]') &&
        !(event.target as Element).closest('#assistant-launcher')
      ) {
        handleClose();
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isOpen]);

  const assistantHint = buildAssistantHint(t.assistantSingleIntro);
  const conversation = buildAssistantConversation(messages, assistantHint);

  const handleApplyProposal = (messageId: string) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target?.proposedMarkdown) {
      return;
    }
    if (target.baseMarkdown !== markdown) {
      addToast(lang === 'zh' ? '简历已更新，这份候选稿已过期。请基于当前内容重新生成。' : 'Your resume changed. Generate a new proposal before applying.', 'warning');
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
      setWidgetView('settings');
      return;
    }

    if (!hasModel) {
      addToast(t.assistantMissingModel, 'warning');
      setWidgetView('settings');
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
    const version = ++requestVersion.current;

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
      if (version !== requestVersion.current) return;

      const normalizeLines = (text: string) => text.replace(/\r\n/g, '\n').trim();
      const hasChanges = result.proposedMarkdown && normalizeLines(result.proposedMarkdown) !== normalizeLines(markdown);

      const riskWarnings = hasChanges && result.proposedMarkdown
        ? getResumeAssistantRiskWarnings(markdown, result.proposedMarkdown)
        : [];

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: createId('assistant'),
          role: 'assistant',
          content: result.reply,
          proposedMarkdown: hasChanges ? result.proposedMarkdown : undefined,
          baseMarkdown: markdown,
          diff: hasChanges && result.proposedMarkdown
            ? buildResumeDiff(markdown, result.proposedMarkdown)
            : undefined,
          riskWarnings,
        },
      ]);
    } catch (error) {
      if (version !== requestVersion.current) return;
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
      if (version === requestVersion.current) setIsSubmitting(false);
    }
  };

  const handleOpen = () => {
    everOpened.current = true;
    setShowLauncher(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setWidgetView('chat');
  };

  useOverlayDialog(isOpen, panelRef, handleClose, compact);
  useEffect(() => { if (isOpen) panelRef.current?.focus({ preventScroll: true }); }, [isOpen, widgetView]);

  const handleClearHistory = () => {
    requestVersion.current++;
    setIsSubmitting(false);
    setMessages([]);
    addToast(t.assistantClearSuccess, 'success');
  };

  const providerLabel = needsAiConfig
    ? t.assistantAiNotConfigured
    : `${activeProvider.name} · ${providerModel}`;

  return createPortal(
    <>
      <div className="app-ui ui-floating-tools pointer-events-none fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-end print:hidden sm:inset-x-auto sm:bottom-6 sm:right-6">
      {isOpen && compact && <div className="ui-backdrop ui-assistant-backdrop" onClick={handleClose} />}
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
            ref={panelRef}
            key="assistant-panel"
            role="dialog"
            aria-modal={compact}
            tabIndex={-1}
            data-ui-dialog
            aria-label={t.assistantTitle}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={overlayTransition}
            className="app-panel pointer-events-auto flex h-[min(720px,calc(100dvh-5.5rem))] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[22px] border shadow-[0_18px_60px_-28px_rgba(40,52,25,0.45)] sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[min(540px,calc(100vw-2rem))] sm:rounded-[24px]"
          >
            <AssistantHeader
              title={widgetView === 'settings' ? t.settingsTitle : t.assistantTitle}
              description={widgetView === 'settings' ? '' : t.assistantDescription}
              closeLabel={t.assistantClose}
              onClose={handleClose}
              onBack={widgetView === 'settings' ? () => setWidgetView('chat') : undefined}
              backLabel={t.assistantBackToChat}
              onClear={widgetView === 'chat' && messages.length > 0 ? handleClearHistory : undefined}
              clearLabel={t.assistantClearHistory}
            />
            {widgetView === 'settings' ? (
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <AiSettings
                  settings={settings}
                  onUpdateProvider={onUpdateProvider}
                  onSetActiveProvider={onSetActiveProvider}
                />
              </div>
            ) : (
              <>
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
                  onConfigure={() => setWidgetView('settings')}
                />
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showLauncher ? (
        <motion.button
          id="assistant-launcher"
          type="button"
          aria-label={t.assistantOpen}
          onClick={handleOpen}
          className="app-primary pointer-events-auto ml-auto inline-flex h-14 w-14 items-center justify-center rounded-full transition-colors"
        >
          <Bot size={22} />
        </motion.button>
      ) : null}
      </div>
    </>
  , document.body);
}
