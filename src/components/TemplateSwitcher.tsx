import type { ResumeTemplate, TranslationSet } from '../config/ui';
import { resumeTemplates } from '../config/ui';

interface TemplateSwitcherProps {
  template: ResumeTemplate;
  translations: TranslationSet;
  onChange: (template: ResumeTemplate) => void;
}

export function TemplateSwitcher({ template, translations: t, onChange }: TemplateSwitcherProps) {
  return (
    <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/preview:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/preview:translate-y-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-1 sm:gap-2 w-max max-w-[90%] overflow-x-auto custom-scrollbar print:hidden">
      <span className="hidden sm:inline text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mr-1 sm:mr-2">{t.template}</span>
      {resumeTemplates.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold capitalize transition-all whitespace-nowrap ${
            template === item
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          {t[item]}
        </button>
      ))}
    </div>
  );
}
