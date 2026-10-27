import { motion } from 'framer-motion';
import { Bot, Edit2, Eye } from 'lucide-react';

import type { ActiveView, TranslationSet } from '../config/ui';

interface MobileViewToggleProps {
  activeView: ActiveView;
  translations: TranslationSet;
  onChange: (view: ActiveView) => void;
}

export function MobileViewToggle({ activeView, translations: t, onChange }: MobileViewToggleProps) {
  return (
    <nav className="ui-edge-nav lg:hidden flex shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] z-50 print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <motion.button
        type="button"
        onClick={() => onChange('editor')}
        aria-pressed={activeView === 'editor'}
        className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors sm:gap-2 sm:py-4 sm:text-sm ${
          activeView === 'editor'
            ? 'text-[var(--ui-selected-ink)] bg-[var(--ui-selected-bg)]'
            : 'app-control text-[var(--muted-foreground)]'
        }`}
      >
        <Edit2 size={16} className="shrink-0" /> <span className="whitespace-nowrap">{t.edit}</span>
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onChange('preview')}
        aria-pressed={activeView === 'preview'}
        className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors sm:gap-2 sm:py-4 sm:text-sm ${
          activeView === 'preview'
            ? 'text-[var(--ui-selected-ink)] bg-[var(--ui-selected-bg)]'
            : 'app-control text-[var(--muted-foreground)]'
        }`}
      >
        <Eye size={16} className="shrink-0" /> <span className="whitespace-nowrap">{t.preview}</span>
      </motion.button>
      <button
        type="button"
        aria-label={t.assistantOpen}
        onClick={() => window.dispatchEvent(new Event('open-resume-assistant'))}
        className="app-control flex min-w-0 flex-1 items-center justify-center gap-1 px-0.5 py-3 text-xs font-semibold text-[var(--muted-foreground)] transition-colors sm:gap-2 sm:px-0 sm:py-4 sm:text-sm"
      >
        <Bot size={16} className="shrink-0" /> <span className="whitespace-nowrap">{t.assistantTab}</span>
      </button>
    </nav>
  );
}
