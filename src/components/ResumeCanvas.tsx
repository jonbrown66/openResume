import { memo, useCallback, useEffect, useRef, useState, type PropsWithChildren, type RefObject } from 'react';

import { pageWidthPx, pageHeightPx, FONT_STYLES } from '@/constants';
import type { ResumeThemeConfig } from '@/types/theme';

interface ResumeCanvasProps extends PropsWithChildren {
  canvasRef?: RefObject<HTMLDivElement | null>;
  scale: number;
  theme?: ResumeThemeConfig;
  template?: string;
}

export const ResumeCanvas = memo(function ResumeCanvas({
  canvasRef,
  children,
  scale,
  theme,
  template,
}: ResumeCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null);
  const localCanvasRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const setCanvasRefs = useCallback((node: HTMLDivElement | null) => {
    localCanvasRef.current = node;
    if (canvasRef) {
      canvasRef.current = node;
    }
  }, [canvasRef]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const gapPx = 24;
  const targetHeight = naturalHeight || pageHeightPx;

  // 动态根据简历的 margin 计算页边距的像素值 (1mm ≈ 3.78px)
  const marginMm = theme?.pageMargin ?? 15;
  const marginPx = Math.round(marginMm * 3.78);
  const contentViewportHeight = pageHeightPx - 2 * marginPx;

  // 根据除去页边距后的可视范围高度来计算总页数（初始估算值）
  const actualContentHeight = targetHeight - 2 * marginPx;
  const estimatedPageCount = Math.max(1, Math.ceil(actualContentHeight / contentViewportHeight));

  useEffect(() => {
    const node = measureRef.current;
    if (!node) {
      return;
    }

    let frame = 0;
    const updateHeight = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        const nextHeight = node.scrollHeight || node.offsetHeight || null;
        setNaturalHeight((previousHeight) => {
          if (previousHeight === nextHeight) {
            return previousHeight;
          }

          return nextHeight;
        });

      });
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (frame) {
          cancelAnimationFrame(frame);
        }
      };
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      observer.disconnect();
    };
  }, [children]);

  // 固定 A4 内容视窗连续切页，避免安全断点回退造成大面积空白或重复
  const pageCount = estimatedPageCount;
  const getPageOffset = (index: number) => {
    return index * contentViewportHeight;
  };

  const injectVariables = {
    '--primary-color': theme?.primaryColor,
    '--secondary-color': theme?.secondaryColor,
    '--font-family': theme ? (FONT_STYLES[theme.fontFamily]?.family || theme.fontFamily) : undefined,
    '--font-size': theme ? `${theme.fontSize}pt` : undefined,
    '--line-height': theme?.lineHeight,
    '--section-spacing': theme ? `${theme.sectionSpacing}px` : undefined,
    '--page-margin': theme ? `${theme.pageMargin}mm` : undefined,
  } as React.CSSProperties;

  return (
    <>
      {/* 1. 隐藏的测量容器（自然高度，用于检测分页和计算安全断点） */}
      <div
        ref={measureRef}
        className="absolute pointer-events-none opacity-0"
        style={{
          width: `${pageWidthPx}px`,
          height: 'auto',
          left: '-9999px',
          top: '-9999px',
        }}
      >
        {children}
      </div>

      {/* 2. 屏幕预览与打印/导出统一多页卡片容器 */}
      <div
        ref={setCanvasRefs}
        className="resume-canvas-screen-preview shrink-0 flex flex-col items-start print:flex mx-auto"
        style={{
          width: `${pageWidthPx * scale}px`,
          height: `${(pageCount * pageHeightPx + (pageCount - 1) * gapPx) * scale}px`,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: `${pageWidthPx}px`,
            height: `${pageCount * pageHeightPx + (pageCount - 1) * gapPx}px`,
            transform: `scale(${scale})`,
            transition: mounted ? 'transform 200ms ease-out' : 'none',
          }}
        >
          {Array.from({ length: pageCount }).map((_, index) => (
            <div
              key={index}
              className={`resume-paper-page-card template-${template || 'classic'} resume-template shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-sm relative overflow-hidden`}
              data-content-offset={getPageOffset(index)}
              style={{
                width: `${pageWidthPx}px`,
                height: `${pageHeightPx}px`,
                marginBottom: index === pageCount - 1 ? 0 : `${gapPx}px`,
                ...injectVariables,
              }}
            >
              {/* 优雅的页码指示 */}
              <div className="absolute right-4 bottom-4 text-[10px] font-bold text-gray-300 pointer-events-none select-none z-40">
                {index + 1} / {pageCount}
              </div>

              {/* 裁剪视窗：定位在 marginPx 处，高度为 contentViewportHeight */}
              <div
                style={{
                  position: 'absolute',
                  top: `${marginPx}px`,
                  left: 0,
                  width: `${pageWidthPx}px`,
                  height: `${contentViewportHeight}px`,
                  overflow: 'hidden',
                }}
              >
                {/* 简历投射：通过安全断点偏移实现多页分割，不会切割文字行 */}
                <div
                  style={{
                    position: 'absolute',
                    top: `-${marginPx + getPageOffset(index)}px`,
                    left: 0,
                    width: `${pageWidthPx}px`,
                    height: 'auto',
                  }}
                >
                  {children}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});
