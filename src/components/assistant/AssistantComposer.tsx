import { Loader2, SendHorizontal } from 'lucide-react';

interface AssistantComposerProps {
  providerLabel: string;
  memoryHint: string;
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
  providerLabel,
  memoryHint,
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
      <div className="mb-2.5 flex items-center justify-between gap-3 text-[11px] leading-4 text-[var(--muted-foreground)]">
        <div className="min-w-0 truncate font-medium text-[var(--secondary-foreground)]/70">{providerLabel}</div>
        {configureLabel ? (
          <button
            type="button"
            onClick={onConfigure}
            className="shrink-0 rounded-full bg-[var(--app-accent-soft)] px-3 py-1.5 font-semibold text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--app-accent)]"
          >
            {configureLabel}
          </button>
        ) : (
          <div className="shrink-0 text-right">{memoryHint}</div>
        )}
      </div>
      <div className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface-muted)]/70 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-colors focus-within:border-[var(--app-accent)]/70 focus-within:bg-[var(--app-surface)]">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={placeholder}
          rows={2}
          className="min-h-[72px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !input.trim()}
            className="app-primary inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
