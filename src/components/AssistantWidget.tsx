import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useOverlayDialog } from '@/hooks/useOverlayDialog';
import { useCompactViewport } from '@/hooks/useCompactViewport';
import { overlayTransition } from '@/lib/motion';
import { Bot, BriefcaseBusiness } from 'lucide-react';

import { AssistantComposer } from '@/components/assistant/AssistantComposer';
import { AssistantConversationList } from '@/components/assistant/AssistantConversationList';
import { AssistantHeader } from '@/components/assistant/AssistantHeader';
import { AiSettings } from '@/components/settings/AiSettings';
import { useToast } from '@/components/ui/Toast';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import type { AppLanguage, TranslationSet } from '@/config/ui';
import {
  ASSISTANT_JOB_DESCRIPTION_LIMIT,
  useAssistantContext,
  useAssistantMemory,
  type AssistantMessage,
} from '@/hooks/useAssistantMemory';
import { buildAssistantConversation, buildAssistantHint } from '@/utils/assistantConversation';
import { requestResumeAssistant } from '@/utils/resumeAssistant';
import { getResumeAssistantRiskWarnings } from '@/utils/resumeAssistantGuard';
import { buildResumeDiff } from '@/utils/resumeDiff';
import { getAssistantTasks, resolveAssistantMode } from '@/utils/assistantTasks';

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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [widgetView, setWidgetView] = useState<'chat' | 'settings'>('chat');
  const [requestNotice, setRequestNotice] = useState<{ error: boolean; text: string } | null>(null);
  const { messages, setMessages } = useAssistantMemory(projectId);
  const {
    jobDescription,
    showJobDescription,
    setJobDescription,
    setShowJobDescription,
  } = useAssistantContext(projectId);

  const panelRef = useRef<HTMLDivElement>(null);
  const compact = useCompactViewport();
  const everOpened = useRef(initiallyOpen);
  useEffect(() => {
    if (!showLauncher || !everOpened.current) return;
    const frame = requestAnimationFrame(() => document.getElementById('assistant-launcher')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [showLauncher]);
  const requestVersion = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const lastAttempt = useRef<{ text: string; history: Array<{ role: 'assistant' | 'user'; content: string }> } | null>(null);
  const lastPreset = useRef('');
  useEffect(() => {
    setInput(''); setRequestNotice(null); setIsSubmitting(false); setStartedAt(null);
    lastAttempt.current = null;
    return () => { requestVersion.current++; controllerRef.current?.abort(); controllerRef.current = null; };
  }, [projectId]);



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

  const conversation = useMemo(() => buildAssistantConversation(messages, buildAssistantHint(t.assistantSingleIntro)), [messages, t.assistantSingleIntro]);
  const tasks = getAssistantTasks(lang);

  const handleApplyProposal = (messageId: string) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target?.proposedMarkdown || target.applied) {
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

  const handleSubmit = async (retry = false) => {
    const trimmedInput = retry ? lastAttempt.current?.text ?? '' : input.trim();
    if (!trimmedInput || controllerRef.current) {
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

    const history = retry ? lastAttempt.current?.history ?? [] : messages.map(({ role, content }) => ({ role, content }));
    if (!retry) setMessages((previousMessages) => [...previousMessages, userMessage]);
    lastAttempt.current = { text: trimmedInput, history };
    if (!retry || input.trim() === trimmedInput) setInput('');
    setRequestNotice(null);
    setIsSubmitting(true);
    setStartedAt(Date.now());
    const version = ++requestVersion.current;
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const result = await requestResumeAssistant({
        mode: resolveAssistantMode(trimmedInput),
        userMessage: trimmedInput,
        markdown,
        lang,
        settings,
        history,
        jobDescription,
        signal: controller.signal,
      });
      if (version !== requestVersion.current) return;

      const normalizeLines = (text: string) => text.replace(/\r\n/g, '\n').trim();
      const hasChanges = resolveAssistantMode(trimmedInput) === 'edit' && result.proposedMarkdown && normalizeLines(result.proposedMarkdown) !== normalizeLines(markdown);

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
      setRequestNotice({ error: true, text: `${t.assistantRequestFailed}: ${message}` });
      setInput(current => current || trimmedInput);
    } finally {
      if (version === requestVersion.current) {
        controllerRef.current = null;
        setIsSubmitting(false);
        setStartedAt(null);
      }
    }
  };

  const handleStop = () => {
    requestVersion.current++;
    controllerRef.current?.abort(); controllerRef.current = null;
    setIsSubmitting(false);
    setStartedAt(null);
    // Remove the unanswered turn so resending the restored draft cannot duplicate it.
    setMessages(previousMessages => {
      const attemptText = lastAttempt.current?.text;
      const last = previousMessages.at(-1);
      return attemptText && last?.role === 'user' && last.content === attemptText
        ? previousMessages.slice(0, -1)
        : previousMessages;
    });
    setInput(current => current || lastAttempt.current?.text || '');
    setRequestNotice({ error: false, text: lang === 'zh' ? '已停止。可以修改问题后重新发送。' : 'Stopped. Edit your question and send again.' });
  };

  const handleCopy = async (content: string) => {
    try { await navigator.clipboard.writeText(content); addToast(lang === 'zh' ? '已复制回复' : 'Reply copied', 'success'); }
    catch { addToast(lang === 'zh' ? '复制失败，请手动选择文字复制。' : 'Could not copy. Select and copy the text manually.', 'error'); }
  };

  const handleOpen = useCallback(() => {
    everOpened.current = true;
    setShowLauncher(false);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('open-resume-assistant', handleOpen);
    return () => window.removeEventListener('open-resume-assistant', handleOpen);
  }, [handleOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setWidgetView('chat');
  };

  useOverlayDialog(isOpen, panelRef, handleClose, compact);
  useEffect(() => { if (isOpen) panelRef.current?.focus({ preventScroll: true }); }, [isOpen, widgetView]);

  const handleClearHistory = () => {
    requestVersion.current++;
    controllerRef.current?.abort(); controllerRef.current = null;
    lastAttempt.current = null; setRequestNotice(null);
    setIsSubmitting(false); setStartedAt(null);
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
            className="app-panel ui-assistant-panel pointer-events-auto flex flex-col overflow-hidden sm:h-[min(680px,calc(100dvh-3rem))] sm:w-[min(540px,calc(100vw-2rem))]"
          >
            <AssistantHeader
              title={widgetView === 'settings' ? t.settingsTitle : t.assistantTitle}
              description=""
              onConfigure={widgetView === 'chat' ? () => setWidgetView('settings') : undefined}
              configureLabel={`${t.settingsTitle} · ${providerLabel}`}
              closeLabel={t.assistantClose}
              onClose={handleClose}
              onBack={widgetView === 'settings' ? () => setWidgetView('chat') : undefined}
              backLabel={t.assistantBackToChat}
              onClear={widgetView === 'chat' && messages.length > 0 ? handleClearHistory : undefined}
              clearLabel={t.assistantClearHistory}
              confirmLabel={lang === 'zh' ? '确认清空' : 'Confirm clear'}
              cancelLabel={lang === 'zh' ? '取消' : 'Cancel'}
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
                {showJobDescription && <div className="shrink-0 border-b border-[var(--app-border)] px-4 py-3 sm:px-5">
                  <details open={showJobDescription} onToggle={event => setShowJobDescription(event.currentTarget.open)}>
                    <summary className="app-control cursor-pointer text-xs leading-6 active:opacity-70">{lang === 'zh' ? '目标岗位 / JD（可选）' : 'Target role / job description (optional)'}</summary>
                    <textarea aria-label={lang === 'zh' ? '目标岗位描述' : 'Target job description'} value={jobDescription} onChange={event => setJobDescription(event.target.value)}
                      placeholder={lang === 'zh' ? '粘贴岗位职责与任职要求；只用于当前简历对话。' : 'Paste responsibilities and requirements for this resume conversation.'}
                      rows={2} maxLength={ASSISTANT_JOB_DESCRIPTION_LIMIT}
                      className="mbs-2 max-h-24 min-h-12 w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-xs leading-5" />
                    <p className="mbs-1 text-end text-[10px] leading-4 text-[var(--muted-foreground)]">{jobDescription.length.toLocaleString()} / {ASSISTANT_JOB_DESCRIPTION_LIMIT.toLocaleString()}</p>
                  </details>
                </div>}
                <AssistantConversationList
                  welcomeActions={
                  <div className="flex flex-wrap gap-2" role="group" aria-label={lang === 'zh' ? '助手任务' : 'Assistant tasks'}>
                    {tasks.map(task => <button key={task.id} type="button" disabled={isSubmitting}
                      onClick={() => {
                        const previousPreset = lastPreset.current;
                        setInput(current => !current.trim() || current === previousPreset ? task.prompt : current);
                        lastPreset.current = task.prompt;
                        if (task.id === 'match') setShowJobDescription(true);
                        requestAnimationFrame(() => panelRef.current?.querySelector<HTMLTextAreaElement>('[data-assistant-input]')?.focus());
                      }} className="app-control min-h-9 shrink-0 rounded-full border border-[var(--app-border)] px-3 text-xs active:opacity-70 disabled:opacity-45">{task.label}</button>)}
                  </div>
                  }
                  conversation={conversation}
                  isSubmitting={isSubmitting}
                  translations={t}
                  onApplyProposal={handleApplyProposal}
                  markdown={markdown}
                  lang={lang}
                  requestStartedAt={startedAt}
                  onCopy={handleCopy}
                />
                {requestNotice && <div role={requestNotice.error ? 'alert' : 'status'} className="shrink-0 border-t border-[var(--app-border)] px-4 py-2 text-xs leading-5">
                  <p className="max-h-20 overflow-y-auto [overflow-wrap:anywhere]">{requestNotice.text}</p>
                  {requestNotice.error && <button type="button" onClick={() => void handleSubmit(true)} className="app-secondary mbs-1 min-h-9 rounded-lg border px-3 active:opacity-70">{lang === 'zh' ? '重试刚才的问题' : 'Retry last request'}</button>}
                </div>}
                <AssistantComposer
                  contextControl={<button type="button" onClick={() => setShowJobDescription(!showJobDescription)}
                    aria-expanded={showJobDescription} aria-label={lang === 'zh' ? '目标岗位 / JD（可选）' : 'Target role / job description (optional)'}
                    className="app-control inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--muted-foreground)]">
                    <BriefcaseBusiness size={14} aria-hidden="true" />{lang === 'zh' ? (jobDescription ? '已添加岗位' : '添加岗位') : (jobDescription ? 'Role added' : 'Add role')}
                  </button>}
                  configureLabel={needsAiConfig ? t.assistantConfigureAi : undefined}
                  placeholder={t.assistantInputPlaceholderEdit}
                  sendLabel={t.assistantSend}
                  isSubmitting={isSubmitting}
                  lang={lang}
                  input={input}
                  onInputChange={setInput}
                  onSubmit={() => void handleSubmit()}
                  onStop={handleStop}
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
          className="app-primary pointer-events-auto ml-auto inline-flex h-14 w-14 items-center justify-center rounded-full transition-colors max-lg:hidden"
        >
          <Bot size={22} />
        </motion.button>
      ) : null}
      </div>
    </>
  , document.body);
}
