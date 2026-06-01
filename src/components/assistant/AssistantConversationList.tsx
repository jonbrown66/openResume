import { Loader2 } from 'lucide-react';

import { ResumeDiffPreview } from '@/components/ResumeDiffPreview';
import type { TranslationSet } from '@/config/ui';
import type { AssistantMessage } from '@/hooks/useAssistantMemory';

interface AssistantConversationListProps {
  conversation: AssistantMessage[];
  isSubmitting: boolean;
  translations: TranslationSet;
  onApplyProposal: (messageId: string) => void;
}

export function AssistantConversationList({
  conversation,
  isSubmitting,
  translations: t,
  onApplyProposal,
}: AssistantConversationListProps) {
  return (
    <div
      data-testid="assistant-conversation"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5"
    >
      {conversation.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
              message.role === 'user'
                ? 'app-primary'
                : 'bg-[var(--app-surface-muted)] text-[var(--secondary-foreground)]'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            {message.diff ? <ResumeDiffPreview diff={message.diff} translations={t} /> : null}
            {message.riskWarnings && message.riskWarnings.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-semibold">{t.assistantRiskPrefix}</span>{' '}
                {message.riskWarnings.join('; ')}.
              </div>
            ) : null}
            {message.proposedMarkdown ? (
              <button
                type="button"
                onClick={() => onApplyProposal(message.id)}
                disabled={message.applied}
                className={`mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  message.applied
                    ? 'bg-[var(--app-accent-soft)] text-[var(--secondary-foreground)]'
                    : 'app-secondary border'
                }`}
              >
                {message.applied ? t.assistantApplied : t.assistantApply}
              </button>
            ) : null}
          </div>
        </div>
      ))}

      {isSubmitting ? (
        <div className="flex justify-start">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <Loader2 size={14} className="animate-spin" />
            {t.assistantThinking}
          </div>
        </div>
      ) : null}
    </div>
  );
}
