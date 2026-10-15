import { memo, useCallback, useEffect, useId, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { pageWidthPx, pageHeightPx, FONT_STYLES } from '@/constants';
import type { ResumeThemeConfig } from '@/types/theme';
import { paginateResume, type PageSlice } from '@/utils/pagination';
interface Props extends PropsWithChildren { canvasRef?: RefObject<HTMLDivElement | null>; scale: number; theme?: ResumeThemeConfig; template?: string; pending?: boolean }
export const ResumeCanvas = memo(function ResumeCanvas({ canvasRef, children, scale, theme, template, pending = false }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const measureId = useId();
  const [measurement, setMeasurement] = useState<{ pages: PageSlice[]; content: typeof children }>({ pages: [], content: null });
  const pages = measurement.pages;
  const setCanvasRefs = useCallback((node: HTMLDivElement | null) => { if (canvasRef) canvasRef.current = node; }, [canvasRef]);
  const marginPx = Math.round((theme?.pageMargin ?? 15) * 3.78);
  const viewportHeight = pageHeightPx - 2 * marginPx;
  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    let frame = 0; let disposed = false;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!disposed) setMeasurement({ pages: paginateResume(node, viewportHeight, marginPx), content: children });
      });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    document.fonts?.ready.then(() => { if (!disposed) measure(); });
    return () => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [children, marginPx, viewportHeight]);
  const pageCount = Math.max(1, pages.length);
  const gap = 24;
  const variables = {
    '--primary-color': theme?.primaryColor, '--secondary-color': theme?.secondaryColor,
    '--font-family': theme ? FONT_STYLES[theme.fontFamily]?.family || theme.fontFamily : undefined,
    '--font-size': theme ? `${theme.fontSize}pt` : undefined, '--line-height': theme?.lineHeight,
    '--section-spacing': theme ? `${theme.sectionSpacing}px` : undefined,
    '--page-margin': theme ? `${theme.pageMargin}mm` : undefined,
  } as React.CSSProperties;
  return <>
    {typeof document !== 'undefined' && createPortal(<div ref={measureRef} data-resume-measure-id={measureId} aria-hidden="true" inert className="resume-measure absolute pointer-events-none opacity-0 print:hidden"
      style={{ width: pageWidthPx, height: 'auto', insetInlineStart: -9999, insetBlockStart: -9999 }}>
      {children}
    </div>, document.body)}
    <div ref={setCanvasRefs} data-measure-id={measureId} aria-busy={pending || measurement.content !== children} data-pagination-ready={!pending && pages.length > 0 && measurement.content === children} className="resume-canvas-screen-preview shrink-0 flex flex-col items-start print:flex mx-auto"
      style={{ width: pageWidthPx * scale, height: (pageCount * pageHeightPx + (pageCount - 1) * gap) * scale }}>
      <div className="origin-top-left" style={{ width: pageWidthPx, transform: `scale(${scale})` }}>
        {Array.from({ length: pageCount }, (_, index) => {
          const page = pages[index];
          return <div key={index} className={`resume-paper-page-card template-${template || 'classic'} resume-template relative overflow-hidden rounded-sm shadow-lg`}
            data-content-offset={page?.offset ?? 0} data-font-family={theme?.fontFamily}
            data-source-offset={(page?.inset ?? marginPx) + (page?.offset ?? 0)}
            style={{ width: pageWidthPx, height: pageHeightPx, marginBlockEnd: index === pageCount - 1 ? 0 : gap, ...variables }}>
            <div aria-hidden="true" className="absolute right-4 bottom-4 text-[10px] text-gray-400 z-40">{index + 1} / {pageCount}</div>
            <div data-page-viewport style={{ position: 'absolute', insetBlockStart: marginPx, insetInlineStart: 0,
              width: pageWidthPx, height: page?.height ?? viewportHeight, overflow: 'hidden', zIndex: 2 }}>
              <div style={{ position: 'absolute', insetBlockStart: -((page?.inset ?? marginPx) + (page?.offset ?? 0)), insetInlineStart: 0, width: pageWidthPx }}
                dangerouslySetInnerHTML={{ __html: page?.html ?? '' }} />
            </div>
          </div>;
        })}
      </div>
    </div>
  </>;
});
