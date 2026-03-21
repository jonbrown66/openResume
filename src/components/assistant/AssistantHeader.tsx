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
    <div className="flex items-start justify-between gap-3 border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800/70">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label={closeLabel}
      >
        <X size={16} />
      </button>
    </div>
  );
}
