import { Edit2, Eye } from 'lucide-react';

import type { ActiveView, TranslationSet } from '../config/ui';

interface MobileViewToggleProps {
  activeView: ActiveView;
  translations: TranslationSet;
  onChange: (view: ActiveView) => void;
}

export function MobileViewToggle({ activeView, translations: t, onChange }: MobileViewToggleProps) {
  return (
    <div className="lg:hidden flex border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shrink-0 z-30 print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <button
        onClick={() => onChange('editor')}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold sm:font-medium flex items-center justify-center gap-2 transition-all ${
          activeView === 'editor'
            ? 'text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10'
            : 'text-gray-500 dark:text-gray-400 border-t-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <Edit2 size={16} /> {t.edit}
      </button>
      <button
        onClick={() => onChange('preview')}
        className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold sm:font-medium flex items-center justify-center gap-2 transition-all ${
          activeView === 'preview'
            ? 'text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10'
            : 'text-gray-500 dark:text-gray-400 border-t-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <Eye size={16} /> {t.preview}
      </button>
    </div>
  );
}
