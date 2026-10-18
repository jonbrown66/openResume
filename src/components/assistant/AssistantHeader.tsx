import { useState, useEffect } from 'react';
import { ArrowLeft, Settings2, Trash2, X, Check } from 'lucide-react';

interface AssistantHeaderProps {
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  onClear?: () => void;
  clearLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfigure?: () => void;
  configureLabel?: string;
}

export function AssistantHeader({
  title,
  description,
  closeLabel,
  onClose,
  onBack,
  backLabel,
  onClear,
  clearLabel,
  confirmLabel = 'Confirm clear',
  cancelLabel = 'Cancel',
  onConfigure,
  configureLabel,
}: AssistantHeaderProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!onClear) {
      setIsConfirming(false);
    }
  }, [onClear]);

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)]/80 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="app-control flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors sm:min-h-0 sm:min-w-0"
            aria-label={backLabel}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onConfigure && <button type="button" onClick={onConfigure} aria-label={configureLabel} title={configureLabel}
          className="app-control flex h-10 w-10 items-center justify-center rounded-full"><Settings2 size={16} /></button>}
        {onClear && (
          isConfirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setIsConfirming(false);
                }}
                className="app-control flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors sm:min-h-0 sm:min-w-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                aria-label={confirmLabel}
                title={confirmLabel}
              >
                <Check size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="app-control flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors sm:min-h-0 sm:min-w-0 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label={cancelLabel}
                title={cancelLabel}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirming(true)}
              className="app-control flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors sm:min-h-0 sm:min-w-0 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:text-red-400"
              aria-label={clearLabel}
              title={clearLabel}
            >
              <Trash2 size={16} />
            </button>
          )
        )}
        <button
          type="button"
          onClick={onClose}
          className="app-control flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors sm:min-h-0 sm:min-w-0"
          aria-label={closeLabel}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
