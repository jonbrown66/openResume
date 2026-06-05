import { memo, useState } from 'react';
import { motion } from 'framer-motion';
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
        <div className="app-panel relative inline-flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-xl border p-1">
          {resumeTemplates.map((item) => (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`relative min-h-10 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors duration-200 whitespace-nowrap sm:min-h-0 sm:px-4 z-10 ${
                template === item
                  ? 'text-[var(--primary-foreground)]'
                  : 'app-control'
              }`}
            >
              {template === item && (
                <motion.div
                  layoutId="activeTemplateTab"
                  className="absolute inset-0 rounded-lg bg-[var(--app-accent)] shadow-sm z-[-1]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t[item]}</span>
            </button>
          ))}
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <button
            onClick={() => setShowCssEditor(true)}
            className="app-primary flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-colors sm:min-h-0 sm:px-4"
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
