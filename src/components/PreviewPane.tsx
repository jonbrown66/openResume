import type { RefObject } from 'react';

import { ResumeRenderer } from './ResumeRenderer';
import { CanvasScaleControls } from './CanvasScaleControls';
import { ResumeCanvas } from './ResumeCanvas';
import { TemplateSwitcher } from './TemplateSwitcher';
import type { ResumeDraft } from '../types/resume';
import type { ResumeTemplate, TranslationSet } from '../config/ui';

interface PreviewPaneProps {
  containerRef: RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  resumeRef: RefObject<HTMLDivElement | null>;
  scale: number;
  template: ResumeTemplate;
  translations: TranslationSet;
  zoomPercent: number;
  onTemplateChange: (template: ResumeTemplate) => void;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
}

export function PreviewPane({
  containerRef,
  draft,
  resumeRef,
  scale,
  template,
  translations,
  zoomPercent,
  onTemplateChange,
  onZoomChange,
  onZoomReset,
}: PreviewPaneProps) {
  return (
    <div className="group/preview flex-1 h-full relative bg-[#f5f2ed] dark:bg-gray-950 flex flex-col transition-colors duration-300 print:flex print:w-full">
      <TemplateSwitcher template={template} translations={translations} onChange={onTemplateChange} />
      <CanvasScaleControls zoom={zoomPercent} onZoomChange={onZoomChange} onReset={onZoomReset} />

      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center items-start pt-16 sm:pt-20 pb-12 custom-scrollbar">
        <ResumeCanvas canvasRef={resumeRef} scale={scale}>
          <ResumeRenderer draft={draft} template={template} />
        </ResumeCanvas>
      </div>
    </div>
  );
}
