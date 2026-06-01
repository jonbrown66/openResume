import { memo, useMemo, type RefObject } from 'react';

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
    zoom: zoomPercent,
    onZoomChange,
    onReset: onZoomReset,
  }), [zoomPercent, onZoomChange, onZoomReset]);

  const canvasProps = useMemo(() => ({
    canvasRef: resumeRef,
    scale,
  }), [resumeRef, scale]);

  const rendererProps = useMemo(() => ({
    draft,
    template,
    theme,
  }), [draft, template, theme]);

  return (
    <div className="group/preview relative flex h-full min-w-0 flex-1 flex-col bg-[var(--app-bg)] transition-colors duration-200 print:flex print:w-full">
      <div className="absolute inset-0 z-20 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 print:hidden pointer-events-none" />
      
      <TemplateSwitcher {...templateSwitcherProps} />
      <CanvasScaleControls {...canvasScaleProps} />

      <div ref={containerRef} className="flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden px-3 pt-16 pb-24 custom-scrollbar sm:px-8 sm:pt-20 sm:pb-12 lg:px-10 lg:pt-24">
        <ResumeCanvas {...canvasProps}>
          <ResumeRenderer {...rendererProps} />
        </ResumeCanvas>
      </div>
    </div>
  );
});
