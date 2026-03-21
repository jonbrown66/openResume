import { memo, useState } from 'react';
import type { ResumeTemplate, TranslationSet } from '@/config/ui';
import { resumeTemplates } from '@/config/ui';
import { CssEditorModal } from './CssEditorModal';

interface TemplateSwitcherProps {
  template: ResumeTemplate;
  translations: TranslationSet;
  onChange: (template: ResumeTemplate) => void;
  customCss: string;
  onCustomCssChange: (css: string) => void;
  onCustomCssReset: () => void;
  lang: 'en' | 'zh';
  onTemplateChange: (template: ResumeTemplate) => void;
  currentFont: string;
}

export const TemplateSwitcher = memo(function TemplateSwitcher({ 
  template, 
  translations: t, 
  onChange,
  customCss,
  onCustomCssChange,
  onCustomCssReset,
  lang,
  currentFont,
}: TemplateSwitcherProps) {
  const [showCssEditor, setShowCssEditor] = useState(false);

  return (
    <>
      <div 
        className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 print:hidden"
      >
        <div className="inline-flex items-center gap-1 sm:gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg border border-zinc-200/50 dark:border-zinc-700/50">
          <span className="hidden sm:inline text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1 sm:mr-2">{t.template}</span>
          {resumeTemplates.map((item) => (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                template === item
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
              }`}
            >
              {t[item]}
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <button
            onClick={() => setShowCssEditor(true)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-800 shadow-sm hover:bg-zinc-700 dark:hover:bg-zinc-300"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="hidden sm:inline">{lang === 'zh' ? '自定义' : 'Custom'}</span>
          </button>
        </div>
      </div>

      <CssEditorModal
        isOpen={showCssEditor}
        onClose={() => setShowCssEditor(false)}
        customCss={customCss}
        onSave={onCustomCssChange}
        onReset={onCustomCssReset}
        lang={lang}
        template={template}
        currentFont={currentFont}
      />
    </>
  );
});
