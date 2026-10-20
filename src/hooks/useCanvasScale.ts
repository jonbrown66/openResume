import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { pageWidthPx } from '../constants';

function getContainerWidth(element: HTMLDivElement) {
  if (typeof window === 'undefined') return 300;
  const style = window.getComputedStyle(element);
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  return Math.max(300, element.clientWidth - paddingLeft - paddingRight);
}

function getInitialZoom(): number {
  return 100;
}

export function useCanvasScale(containerRef: RefObject<HTMLDivElement | null>) {
  const [fitScale, setFitScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(getInitialZoom);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let frame = 0;

    const updateScale = () => {
      const availableWidth = getContainerWidth(container);
      setFitScale(Math.min(1, availableWidth / pageWidthPx));
    };

    if (!initialized.current) {
      updateScale();
      initialized.current = true;
    }

    const scheduleScale = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateScale);
    };
    const observer = new ResizeObserver(scheduleScale);
    observer.observe(container);
    window.addEventListener('resize', scheduleScale);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleScale);
    };
  }, [containerRef]);

  const scale = useMemo(() => fitScale * (zoomPercent / 100), [fitScale, zoomPercent]);

  const resetZoom = useCallback(() => setZoomPercent(100), []);
  const updateZoom = useCallback((delta: number) => {
    setZoomPercent((current) => Math.max(60, Math.min(250, current + delta)));
  }, []);

  return {
    scale,
    fitScale,
    zoomPercent,
    resetZoom,
    updateZoom,
  };
}
