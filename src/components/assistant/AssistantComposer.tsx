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
    <div className="border-t border-zinc-200/70 px-5 py-4 dark:border-zinc-800/70">
      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="min-w-0 truncate">{providerLabel}</div>
        <div className="shrink-0 text-right leading-4">{memoryHint}</div>
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-2 dark:border-zinc-800/80 dark:bg-zinc-900">
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
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
