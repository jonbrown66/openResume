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
        className="absolute left-1/2 top-3 z-30 -translate-x-1/2 opacity-100 transition-opacity duration-200 print:hidden sm:top-5"
      >
        <div className="app-panel inline-flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-xl border px-1.5 py-1.5 sm:px-3 sm:py-2">
          <span className="hidden sm:inline text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1 sm:mr-2">{t.template}</span>
          {resumeTemplates.map((item) => (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`min-h-10 rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize transition-colors whitespace-nowrap sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                template === item
                  ? 'app-active shadow-sm'
                  : 'app-control'
              }`}
            >
              {t[item]}
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <button
            onClick={() => setShowCssEditor(true)}
            className="app-primary flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-semibold shadow-sm transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
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
