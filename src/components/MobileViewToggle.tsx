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
    <nav className="lg:hidden flex border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shrink-0 z-30 print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <motion.button
        onClick={() => onChange('editor')}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          activeView === 'editor'
            ? 'text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-900 dark:border-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/30'
            : 'text-zinc-500 dark:text-zinc-400 border-t-2 border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <Edit2 size={16} /> {t.edit}
      </motion.button>
      <motion.button
        onClick={() => onChange('preview')}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          activeView === 'preview'
            ? 'text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-900 dark:border-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/30'
            : 'text-zinc-500 dark:text-zinc-400 border-t-2 border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <Eye size={16} /> {t.preview}
      </motion.button>
    </nav>
  );
}
