import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { pageWidthPx } from '../constants';

function getContainerWidth(element: HTMLDivElement) {
  const isMobile = window.innerWidth < 640;
  const padding = isMobile ? 12 : 64;
  return Math.max(300, element.clientWidth - padding);
}

function getInitialZoom(): number {
  if (typeof window === 'undefined') return 90;
  return window.innerWidth < 640 ? 100 : 90;
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

    const updateScale = () => {
      const availableWidth = getContainerWidth(container);
      setFitScale(Math.min(1, availableWidth / pageWidthPx));
    };

    if (!initialized.current) {
      updateScale();
      initialized.current = true;
    }

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef]);

  const scale = useMemo(() => fitScale * (zoomPercent / 100), [fitScale, zoomPercent]);

  const resetZoom = useCallback(() => setZoomPercent(getInitialZoom()), []);
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
