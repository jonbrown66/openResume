import { memo, useCallback, useEffect, useRef, useState, type PropsWithChildren, type RefObject } from 'react';

import { pageWidthPx } from '@/constants';

interface ResumeCanvasProps extends PropsWithChildren {
  canvasRef?: RefObject<HTMLDivElement | null>;
  scale: number;
}

export const ResumeCanvas = memo(function ResumeCanvas({ canvasRef, children, scale }: ResumeCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const localCanvasRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const node = localCanvasRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      setContentHeight(node.scrollHeight || node.offsetHeight || null);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      className="shrink-0"
      style={{
        width: `${pageWidthPx * scale}px`,
        height: contentHeight ? `${contentHeight * scale}px` : undefined,
      }}
    >
      <div
        ref={setCanvasRefs}
        className="resume-paper flex flex-col bg-[#ffffff] text-[#111827] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-sm hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] origin-top-left"
        style={{
          width: `${pageWidthPx}px`,
          height: 'auto',
          transform: `scale(${scale})`,
          transition: mounted ? 'transform 200ms ease-out, box-shadow 300ms' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
});
