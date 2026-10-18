import { Loader2, SendHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

interface AssistantComposerProps {
  lang?: 'zh' | 'en';
  onStop?: () => void;
  contextControl?: ReactNode;
  configureLabel?: string;
  placeholder: string;
  sendLabel: string;
  isSubmitting: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onConfigure?: () => void;
}

export function AssistantComposer({
  lang = 'en',
  onStop,
  contextControl,
  configureLabel,
  placeholder,
  sendLabel,
  isSubmitting,
  input,
  onInputChange,
  onSubmit,
  onConfigure,
}: AssistantComposerProps) {
  return (
    <div className="shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)]/80 px-4 py-3 sm:px-5 sm:py-4">
      {configureLabel && <div className="mb-2 text-xs text-[var(--muted-foreground)]">
          <button
            type="button"
            onClick={onConfigure}
            className="shrink-0 rounded-full bg-[var(--app-accent-soft)] px-3 py-1.5 font-semibold text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--app-accent)]"
          >
            {configureLabel}
          </button>
      </div>}
      <div className="ui-composer border border-[var(--app-border)] bg-[var(--app-surface)] p-2 transition-colors focus-within:border-[var(--ui-focus)] sm:p-2.5">
        <textarea
          data-ui-plain
          data-assistant-input
          aria-label={placeholder}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              if (event.nativeEvent.isComposing) {
                return;
              }
              event.preventDefault();
              if (input.trim() && !isSubmitting) {
                onSubmit();
              }
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="min-h-16 max-h-36 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 text-sm leading-6 text-zinc-700 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500 [field-sizing:content] sm:min-h-[72px] sm:max-h-40"
        />
        <div className="mbs-1.5 flex items-center justify-between gap-2">
          {contextControl}
          {isSubmitting && onStop ? <button type="button" onClick={onStop} className="app-secondary inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-semibold active:opacity-70">{lang === 'zh' ? '停止' : 'Stop'}</button> : <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !input.trim()}
            className="app-primary inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
            {sendLabel}
          </button>}
        </div>
      </div>
    </div>
  );
}
