import { memo, useDeferredValue, useMemo, type RefObject } from 'react';

import { ResumeRenderer } from './ResumeRenderer';
import { CanvasScaleControls } from './CanvasScaleControls';
import { ResumeCanvas } from './ResumeCanvas';
import { TemplateSwitcher } from './TemplateSwitcher';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeTemplate, TranslationSet } from '@/config/ui';
import { DEFAULT_THEME_CONFIG, type ResumeThemeConfig } from '@/types/theme';

interface PreviewPaneProps {
  pending?: boolean;
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
  pending = false,
  containerRef,
  draft,
  resumeRef,
  scale,
  template,
  theme: currentTheme,
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
  const theme = useDeferredValue(currentTheme);
  const previewPending = pending || deferredDraft !== draft || theme !== currentTheme;
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
    lang,
  }), [resumeRef, scale, theme, template, previewPending, lang]);

  // Color changes are painted through inherited variables; Markdown and its
  // pagination input only change when content or typography/layout changes.
  const { fontFamily, fontSize, lineHeight, sectionSpacing, pageMargin, customCss } = theme;
  const renderTheme = useMemo(() => ({ ...DEFAULT_THEME_CONFIG,
    fontFamily, fontSize, lineHeight, sectionSpacing, pageMargin, customCss,
  }), [fontFamily, fontSize, lineHeight, sectionSpacing, pageMargin, customCss]);
  const rendererProps = useMemo(() => ({
    draft: deferredDraft,
    template,
    theme: renderTheme,
    inheritColors: true,
  }), [deferredDraft, template, renderTheme]);
  const renderedResume = useMemo(() => <ResumeRenderer {...rendererProps} />, [rendererProps]);

  return (
    <div className="group/preview relative flex h-full min-w-0 flex-1 flex-col bg-[var(--app-bg)] transition-colors duration-200 print:flex print:w-full">
      <div className="absolute inset-0 z-20 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 print:hidden pointer-events-none" />

      <TemplateSwitcher {...templateSwitcherProps} scaleControls={<CanvasScaleControls {...canvasScaleProps} />} />

      <div ref={containerRef} data-testid="preview-scroll" className="flex min-h-0 flex-1 items-start justify-start overflow-auto px-3 pb-24 custom-scrollbar [contain:layout_paint_style] sm:px-6 sm:pb-12 lg:px-8 xl:px-10">
        <ResumeCanvas {...canvasProps}>
          {renderedResume}
        </ResumeCanvas>
      </div>
    </div>
  );
});
