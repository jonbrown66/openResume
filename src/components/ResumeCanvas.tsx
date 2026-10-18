import { memo, useCallback, useEffect, useId, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { pageWidthPx, pageHeightPx } from '@/constants';
import { ensureResumeFonts, fontFamily } from '@/lib/resumeFonts';
import type { ResumeThemeConfig } from '@/types/theme';
import { paginateResumeAsync, type PageSlice } from '@/utils/pagination';
interface Props extends PropsWithChildren { canvasRef?: RefObject<HTMLDivElement | null>; scale: number; theme?: ResumeThemeConfig; template?: string; pending?: boolean; lang?: 'en' | 'zh' }
// A fresh dangerouslySetInnerHTML prop can replace the entire subtree even when
// only the surrounding page colors changed. Keep measured HTML mounted.
const PageProjection = memo(function PageProjection({ html, sourceOffset }: { html: string; sourceOffset: number }) {
  return <div style={{ position: 'absolute', insetBlockStart: -sourceOffset, insetInlineStart: 0, width: pageWidthPx }}
    dangerouslySetInnerHTML={{ __html: html }} />;
});
export const ResumeCanvas = memo(function ResumeCanvas({ canvasRef, children, scale, theme, template, pending = false, lang = 'zh' }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const measureId = useId();
  const layoutKey = JSON.stringify([template, theme?.fontFamily, theme?.fontSize,
    theme?.lineHeight, theme?.sectionSpacing, theme?.pageMargin, theme?.customCss]);
  const [measurement, setMeasurement] = useState<{ pages: PageSlice[]; content: typeof children; layoutKey: string; complete: boolean }>({ pages: [], content: null, layoutKey: '', complete: false });
  const expectedPageCount = useRef(1);
  const pages = measurement.pages;
  const [fontResult, setFontResult] = useState<{ content: typeof children; error?: string }>({ content: null });
  const [fontRetry, setFontRetry] = useState(0);
  const setCanvasRefs = useCallback((node: HTMLDivElement | null) => { if (canvasRef) canvasRef.current = node; }, [canvasRef]);
  const marginPx = Math.round((theme?.pageMargin ?? 15) * 3.78);
  const viewportHeight = pageHeightPx - 2 * marginPx;
  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    let frame = 0; let timer: ReturnType<typeof setTimeout>; let disposed = false; let fontsReady = false;
    let generation = 0;
    let measuredSize = '';
    const size = () => `${node.offsetWidth}:${node.offsetHeight}`;
    const measure = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      const token = ++generation;
      if (!fontsReady || disposed) return;
      timer = setTimeout(() => {
        frame = requestAnimationFrame(async () => {
          if (disposed || generation !== token) return;
          const pages = await paginateResumeAsync(
            node,
            viewportHeight,
            marginPx,
            () => disposed || generation !== token,
            firstPage => {
              if (disposed || generation !== token) return;
              setMeasurement({ pages: firstPage, content: children, layoutKey, complete: false });
            },
          );
          if (!pages || disposed || generation !== token) return;
          measuredSize = size();
          expectedPageCount.current = Math.max(1, pages.length);
          setMeasurement({ pages, content: children, layoutKey, complete: true });
        });
      }, 40);
    };
    ensureResumeFonts(theme?.fontFamily ?? 'Geist', node.textContent ?? '').then(() => {
      if (disposed) return;
      fontsReady = true;
      setFontResult({ content: children });
      measure();
    }).catch((error: unknown) => {
      if (disposed) return;
      // Keep a readable preview, but do not mark a failed font as export-ready.
      fontsReady = true;
      setFontResult({ content: children, error: error instanceof Error ? error.message : 'Font could not be loaded. Choose a built-in font or retry.' });
      measure();
    });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (size() !== measuredSize) measure();
    });
    observer?.observe(node);
    return () => { disposed = true; clearTimeout(timer); cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [children, marginPx, viewportHeight, theme?.fontFamily, fontRetry, layoutKey]);
  const pageCount = Math.max(1, pages.length, expectedPageCount.current);
  const gap = 24;
  const variables = {
    '--resume-theme-accent': theme?.primaryColor, '--resume-theme-secondary': theme?.secondaryColor,
    '--resume-theme-paper': theme?.backgroundColor,
    '--primary-color': theme?.primaryColor, '--secondary-color': theme?.secondaryColor,
    '--resume-paper': theme?.backgroundColor, '--resume-ivory': theme?.backgroundColor,
    '--font-family': theme ? fontFamily(theme.fontFamily) : undefined,
    '--font-size': theme ? `${theme.fontSize}pt` : undefined, '--line-height': theme?.lineHeight,
    '--section-spacing': theme ? `${theme.sectionSpacing}px` : undefined,
    '--page-margin': theme ? `${theme.pageMargin}mm` : undefined,
  } as React.CSSProperties;
  return <>
    {typeof document !== 'undefined' && createPortal(<div ref={measureRef} data-resume-measure-id={measureId} aria-hidden="true" inert className="resume-measure absolute pointer-events-none opacity-0 print:hidden"
      style={{ ...variables, width: pageWidthPx, height: 'auto', insetInlineStart: -9999, insetBlockStart: -9999 }}>
      {children}
    </div>, document.body)}
    <div ref={setCanvasRefs} data-measure-id={measureId} data-font-error={fontResult.content === children ? fontResult.error : undefined} aria-busy={pending || measurement.content !== children || measurement.layoutKey !== layoutKey || !measurement.complete || fontResult.content !== children} data-pagination-ready={!pending && !fontResult.error && fontResult.content === children && measurement.complete && pages.length > 0 && measurement.content === children && measurement.layoutKey === layoutKey} className="resume-canvas-screen-preview relative shrink-0 flex flex-col items-start print:flex mx-auto"
      style={{ width: pageWidthPx * scale, height: (pageCount * pageHeightPx + (pageCount - 1) * gap) * scale }}>
      {fontResult.content === children && fontResult.error && <div role="alert" className="app-ui absolute z-50 w-full max-w-sm rounded-lg border bg-[var(--app-surface)] p-3 text-sm shadow-sm">
        {lang === 'zh' ? '字体加载失败，当前为回退预览。请在样式中选择内置字体，或重试加载。' : 'Font loading failed. Showing a fallback preview. Choose a built-in font in Style or retry.'}
        <button type="button" className="app-secondary min-h-11 rounded-lg px-2 underline active:opacity-80" onClick={() => setFontRetry(value => value + 1)}>{lang === 'zh' ? '重试加载' : 'Retry font loading'}</button>
      </div>}
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
              <PageProjection sourceOffset={(page?.inset ?? marginPx) + (page?.offset ?? 0)} html={page?.html ?? ''} />
            </div>
          </div>;
        })}
      </div>
    </div>
  </>;
});
