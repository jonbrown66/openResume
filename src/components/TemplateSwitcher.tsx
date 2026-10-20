import { memo, useState, type ReactNode } from 'react';
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
  scaleControls?: ReactNode;
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
  scaleControls,
}: TemplateSwitcherProps) {
  const [showCssEditor, setShowCssEditor] = useState(false);

  return (
    <>
      <div
        className="absolute left-1/2 top-[10px] z-30 -translate-x-1/2 opacity-100 transition-opacity duration-200 print:hidden sm:top-[13px]"
      >
        <div className="flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col items-stretch gap-0.5 rounded-[var(--ui-radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5 sm:w-auto sm:flex-row sm:items-center sm:justify-start">
          <div className="flex min-w-0 items-center justify-center gap-0.5 sm:justify-start">
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:flex-none sm:overflow-visible">
          {resumeTemplates.map((item) => (
            <button
              key={item}
              onClick={() => onChange(item)}
              aria-pressed={template === item}
              className={`relative min-h-10 shrink-0 rounded-[var(--ui-radius-control)] px-2.5 py-2 text-xs font-semibold capitalize transition-colors duration-200 whitespace-nowrap sm:min-h-8 sm:px-4 z-10 ${
                template === item
                  ? 'text-[var(--ui-selected-ink)]'
                  : 'app-control'
              }`}
            >
              {template === item && (
                <motion.div
                  layoutId="activeTemplateTab"
                  className="absolute inset-0 rounded-[var(--ui-radius-control)] bg-[var(--ui-selected-bg)] z-[-1]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t[item]}</span>
            </button>
          ))}
          </div>
          <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--app-border)]" />
          <button
            onClick={() => setShowCssEditor(true)}
            aria-label={t.customCss}
            className="app-control flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ui-radius-control)] px-2 py-2 text-xs font-semibold transition-colors sm:min-h-8 sm:px-3"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="hidden sm:inline">{lang === 'zh' ? '自定义' : 'Custom'}</span>
          </button>
          </div>
          {scaleControls && <div className="mx-0.5 hidden h-4 w-px shrink-0 bg-[var(--app-border)] sm:block" />}
          {scaleControls && <div className="flex items-center justify-center sm:justify-start">{scaleControls}</div>}
        </div>
      </div>

      {showCssEditor && <CssEditorModal
        isOpen={showCssEditor}
        onClose={() => setShowCssEditor(false)}
        customCss={customCss}
        onSave={onCustomCssChange}
        onReset={onCustomCssReset}
        lang={lang}
        template={template}
        currentFont={currentFont}
      />}
    </>
  );
});
