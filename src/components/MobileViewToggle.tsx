import { motion } from 'framer-motion';
import { Edit2, Eye } from 'lucide-react';

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
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          activeView === 'editor'
            ? 'text-[var(--ui-selected-ink)] bg-[var(--ui-selected-bg)]'
            : 'app-control text-[var(--muted-foreground)]'
        }`}
      >
        <Edit2 size={16} /> {t.edit}
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onChange('preview')}
        aria-pressed={activeView === 'preview'}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          activeView === 'preview'
            ? 'text-[var(--ui-selected-ink)] bg-[var(--ui-selected-bg)]'
            : 'app-control text-[var(--muted-foreground)]'
        }`}
      >
        <Eye size={16} /> {t.preview}
      </motion.button>
    </nav>
  );
}
