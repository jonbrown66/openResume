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
    <nav className="lg:hidden flex shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)]/90 backdrop-blur-xl z-50 print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <motion.button
        type="button"
        onClick={() => onChange('editor')}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          activeView === 'editor'
            ? 'text-[var(--primary-foreground)] border-t-2 border-[var(--app-accent)] bg-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
            : 'text-[var(--muted-foreground)] border-t-2 border-transparent hover:bg-[var(--app-accent-soft)]'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <Edit2 size={16} /> {t.edit}
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onChange('preview')}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          activeView === 'preview'
            ? 'text-[var(--primary-foreground)] border-t-2 border-[var(--app-accent)] bg-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
            : 'text-[var(--muted-foreground)] border-t-2 border-transparent hover:bg-[var(--app-accent-soft)]'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <Eye size={16} /> {t.preview}
      </motion.button>
    </nav>
  );
}
