import { memo, useDeferredValue, useMemo, type RefObject } from 'react';

import { ResumeRenderer } from './ResumeRenderer';
import { CanvasScaleControls } from './CanvasScaleControls';
import { ResumeCanvas } from './ResumeCanvas';
import { TemplateSwitcher } from './TemplateSwitcher';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeTemplate, TranslationSet } from '@/config/ui';
import type { ResumeThemeConfig } from '@/types/theme';

interface PreviewPaneProps {
  containerRef: RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  resumeRef: RefObject<HTMLDivElement | null>;
  scale: number;
  template: ResumeTemplate;
  theme: ResumeThemeConfig;
  translations: TranslationSet;
  zoomPercent: number;
  lang: 'en' | 'zh';
  onTemplateChange: (template: ResumeTemplate) => void;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
  onCustomCssChange: (css: string) => void;
  onCustomCssReset: () => void;
  currentFont: string;
}

export const PreviewPane = memo(function PreviewPane({
  containerRef,
  draft,
  resumeRef,
  scale,
  template,
  theme,
  translations,
  zoomPercent,
  lang,
  onTemplateChange,
  onZoomChange,
  onZoomReset,
  onCustomCssChange,
  onCustomCssReset,
  currentFont,
}: PreviewPaneProps) {
  const deferredDraft = useDeferredValue(draft);
  const previewPending = deferredDraft !== draft;
  const templateSwitcherProps = useMemo(() => ({
    template,
    translations,
    onChange: onTemplateChange,
    customCss: theme.customCss,
    onCustomCssChange: onCustomCssChange,
    onCustomCssReset: onCustomCssReset,
    lang,
    onTemplateChange,
    currentFont,
  }), [template, translations, onTemplateChange, theme.customCss, onCustomCssChange, onCustomCssReset, lang, currentFont]);

  const canvasScaleProps = useMemo(() => ({
    lang,
    zoom: zoomPercent,
    actualScale: scale,
    onZoomChange,
    onReset: onZoomReset,
  }), [lang, zoomPercent, scale, onZoomChange, onZoomReset]);

  const canvasProps = useMemo(() => ({
    canvasRef: resumeRef,
    scale,
    theme,
    template,
    pending: previewPending,
  }), [resumeRef, scale, theme, template, previewPending]);

  const rendererProps = useMemo(() => ({
    draft: deferredDraft,
    template,
    theme,
  }), [deferredDraft, template, theme]);
  const renderedResume = useMemo(() => <ResumeRenderer {...rendererProps} />, [rendererProps]);

  return (
    <div className="group/preview relative flex h-full min-w-0 flex-1 flex-col bg-[var(--app-bg)] transition-colors duration-200 print:flex print:w-full">
      <div className="absolute inset-0 z-20 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 print:hidden pointer-events-none" />

      <TemplateSwitcher {...templateSwitcherProps} />
      <CanvasScaleControls {...canvasScaleProps} />

      <div ref={containerRef} data-testid="preview-scroll" className="flex flex-1 items-start justify-start overflow-auto px-3 pt-16 pb-24 custom-scrollbar [contain:layout_paint_style] sm:px-8 sm:pt-20 sm:pb-12 lg:px-10 lg:[padding-inline-end:6rem] lg:pt-24">
        <ResumeCanvas {...canvasProps}>
          {renderedResume}
        </ResumeCanvas>
      </div>
    </div>
  );
});
