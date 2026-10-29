import { memo, useState, type ReactNode } from 'react';
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
      <div className="@container shrink-0 px-3 py-3 print:hidden sm:px-6 lg:px-5 lg:py-2.5">
        <div data-testid="preview-toolbar" className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 max-w-full grow shrink-0 flex-nowrap items-center gap-0.5 rounded-[var(--ui-radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
            <div className="relative isolate grid min-w-0 flex-1 grid-cols-4 gap-0.5">
              <span aria-hidden="true" className="ui-segment-indicator pointer-events-none col-start-1 row-start-1 rounded-[var(--ui-radius-control)] bg-[var(--ui-selected-bg)]"
                style={{ transform: `translateX(calc(${resumeTemplates.indexOf(template)} * (100% + 0.125rem)))` }} />
              {resumeTemplates.map((item, index) => (
                <button
                  key={item}
                  onClick={() => onChange(item)}
                  aria-pressed={template === item}
                  style={{ gridColumnStart: index + 1 }}
                  className={`ui-segment-button relative z-10 row-start-1 min-h-10 rounded-[var(--ui-radius-control)] px-1.5 py-2 text-xs font-semibold capitalize whitespace-nowrap transition-colors duration-200 sm:min-h-8 @min-[640px]:px-4 ${
                    template === item
                      ? 'text-[var(--ui-selected-ink)]'
                      : 'app-control'
                  }`}
                >
                  <span className="relative z-10">{t[item]}</span>
                </button>
              ))}
            </div>
            <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--app-border)]" />
            <button
              onClick={() => setShowCssEditor(true)}
              aria-label={t.customCss}
              className="app-control flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ui-radius-control)] px-2 py-2 text-xs font-semibold transition-colors sm:min-h-8 @min-[640px]:px-3"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="hidden @min-[640px]:inline">{lang === 'zh' ? '自定义' : 'Custom'}</span>
            </button>
          </div>
          {scaleControls && <div className="ms-auto flex shrink-0 items-center justify-center rounded-[var(--ui-radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">{scaleControls}</div>}
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
