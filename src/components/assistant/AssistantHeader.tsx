import { X } from 'lucide-react';

interface AssistantHeaderProps {
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
}

export function AssistantHeader({
  title,
  description,
  closeLabel,
  onClose,
}: AssistantHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)]/80 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="app-control flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors sm:min-h-0 sm:min-w-0"
        aria-label={closeLabel}
      >
        <X size={16} />
      </button>
    </div>
  );
}
