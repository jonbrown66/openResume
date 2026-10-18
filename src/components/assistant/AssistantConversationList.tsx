import { memo, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Copy, Loader2 } from 'lucide-react';
import { ResumeDiffPreview } from '@/components/ResumeDiffPreview';
import { AssistantReply } from './AssistantReply';
import type { TranslationSet } from '@/config/ui';
import type { AssistantMessage } from '@/hooks/useAssistantMemory';

interface AssistantConversationListProps {
  conversation: AssistantMessage[];
  isSubmitting: boolean;
  requestStartedAt?: number | null;
  translations: TranslationSet;
  onApplyProposal: (messageId: string) => void;
  markdown?: string;
  lang?: 'zh' | 'en';
  onCopy?: (content: string) => void;
  welcomeActions?: ReactNode;
}
const warningLabels: Record<string, string> = {
  'work experience order changed': '工作经历顺序或职位、公司发生变化',
  'work experience dates changed': '工作经历时间发生变化',
  'resume sections removed': '原有章节被删除',
  'personal information changed': '姓名或联系方式发生变化',
  'new numeric claims added': '出现原文中没有的数字，请核实依据',
};
export const AssistantConversationList = memo(function AssistantConversationList({
  conversation, isSubmitting, requestStartedAt, translations: t, onApplyProposal, markdown, lang = 'en', onCopy, welcomeActions,
}: AssistantConversationListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const initialized = useRef(false);
  const [showLatest, setShowLatest] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const latestId = conversation.at(-1)?.id;
  useLayoutEffect(() => {
    if (!isSubmitting || !requestStartedAt) {
      setElapsed(0);
      return;
    }
    const update = () => setElapsed(Math.max(0, Math.round((Date.now() - requestStartedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [isSubmitting, requestStartedAt]);
  const scrollLatest = () => {
    const node = ref.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    follow.current = true;
    setShowLatest(false);
  };
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!initialized.current || follow.current || conversation.at(-1)?.role === 'user') {
      const last = node.querySelector<HTMLElement>('[data-assistant-message]:last-child');
      // Start a long answer at its beginning, so its conclusion remains readable.
      if (initialized.current && !isSubmitting && conversation.at(-1)?.role === 'assistant' && last) {
        node.scrollTop += last.getBoundingClientRect().top - node.getBoundingClientRect().top;
      } else node.scrollTop = node.scrollHeight;
      setShowLatest(false);
    } else setShowLatest(true);
    initialized.current = true;
  }, [latestId, isSubmitting, conversation]);
  return <div className="relative flex min-h-0 flex-1 flex-col">
    <div ref={ref} data-testid="assistant-conversation" role="log" aria-label={lang === 'zh' ? '助手对话' : 'Assistant conversation'}
      onScroll={() => {
        const node = ref.current;
        if (!node) return;
        follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
        if (follow.current) setShowLatest(false);
      }} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable] sm:px-5 sm:py-5">
      {conversation.map(message => {
        if (message.id === 'assistant-hint') return <div key={message.id} className="py-8">
          <p className="mb-5 text-sm leading-6 text-[var(--muted-foreground)]">{message.content}</p>
          {welcomeActions}
        </div>;
        const stale = Boolean(message.proposedMarkdown && markdown !== undefined && message.baseMarkdown !== markdown);
        return <div key={message.id} data-assistant-message className={`flex min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`ui-chat-bubble min-w-0 px-4 py-3 text-sm leading-6 ${message.role === 'user'
            ? 'max-w-[88%] bg-[var(--ui-selected-bg)] text-[var(--secondary-foreground)]'
            : 'w-full text-[var(--secondary-foreground)]'}`}>
            {message.role === 'user' ? <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p> : <AssistantReply content={message.content} />}
            {message.diff && <ResumeDiffPreview compact diff={message.diff} translations={t} />}
            {message.riskWarnings && message.riskWarnings.length > 0 && <div className="mbs-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-semibold">{t.assistantRiskPrefix}</p>
              <ul className="list-disc ps-4">{message.riskWarnings.map(warning => <li key={warning}>{lang === 'zh' ? warningLabels[warning] ?? warning : warning}</li>)}</ul>
            </div>}
            <div className="mbs-2 flex flex-wrap items-center gap-2">
              {message.proposedMarkdown && <button type="button" onClick={() => onApplyProposal(message.id)} disabled={message.applied || stale}
                className="app-secondary inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-medium active:opacity-70 disabled:opacity-60">
                {message.applied ? t.assistantApplied : stale ? (lang === 'zh' ? '候选稿已过期' : 'Outdated proposal') : t.assistantApply}
              </button>}
              {message.role === 'assistant' && message.id !== 'assistant-hint' && onCopy && <button type="button" onClick={() => onCopy(message.content)}
                className="app-control inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs active:opacity-70"><Copy size={13} aria-hidden="true" />{lang === 'zh' ? '复制回复' : 'Copy reply'}</button>}
            </div>
            {stale && !message.applied && <p className="text-xs text-[var(--muted-foreground)]">{lang === 'zh' ? '简历已更新，请基于当前内容重新生成。' : 'Your resume has changed. Generate a new candidate from the current content.'}</p>}
          </div>
        </div>;
      })}
      {isSubmitting && <div role="status" className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
        <Loader2 size={14} className="mbs-1 shrink-0 animate-spin" aria-hidden="true" />
        <span>{t.assistantThinking}{requestStartedAt ? <span className="ms-1 tabular-nums">{elapsed}s</span> : null}</span>
      </div>}
    </div>
    {showLatest && <button type="button" onClick={scrollLatest} className="app-secondary absolute [inset-inline-end:1rem] [inset-block-end:0.5rem] inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs shadow-sm active:opacity-70"><ArrowDown size={13} aria-hidden="true" />{lang === 'zh' ? '查看最新回复' : 'Latest reply'}</button>}
  </div>;
});
