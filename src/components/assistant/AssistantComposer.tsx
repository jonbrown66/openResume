import { Loader2, SendHorizontal } from 'lucide-react';

interface AssistantComposerProps {
  providerLabel: string;
  memoryHint: string;
  placeholder: string;
  sendLabel: string;
  isSubmitting: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

export function AssistantComposer({
  providerLabel,
  memoryHint,
  placeholder,
  sendLabel,
  isSubmitting,
  input,
  onInputChange,
  onSubmit,
}: AssistantComposerProps) {
  return (
    <div className="shrink-0 border-t border-[var(--app-border)] px-4 py-3 sm:px-5 sm:py-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="min-w-0 truncate">{providerLabel}</div>
        <div className="max-w-[45%] shrink-0 text-right leading-4 sm:max-w-none">{memoryHint}</div>
      </div>
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-2">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={placeholder}
          rows={2}
          className="min-h-[64px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !input.trim()}
            className="app-primary inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
