import { useCallback, useEffect, useRef, useState } from 'react';

import { pageWidthPx } from '../constants';

function getContainerWidth(element: HTMLDivElement) {
  const isMobile = window.innerWidth < 640;
  const padding = isMobile ? 12 : 64;
  return Math.max(300, element.clientWidth - padding);
}

export function useCanvasScale(container: HTMLDivElement | null) {
  const [fitScale, setFitScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(window.innerWidth < 640 ? 100 : 90);
  const initialized = useRef(false);

  useEffect(() => {
    if (!container) {
      return;
    }

    const updateScale = () => {
      const availableWidth = getContainerWidth(container);
      setFitScale(Math.min(1, availableWidth / pageWidthPx));
    };

    // Compute immediately on mount — no flash because we set state before paint
    if (!initialized.current) {
      updateScale();
      initialized.current = true;
    }

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(container);

    return () => observer.disconnect();
  }, [container]);

  const scale = fitScale * (zoomPercent / 100);

  return {
    scale,
    fitScale,
    zoomPercent,
    resetZoom: useCallback(() => setZoomPercent(window.innerWidth < 640 ? 100 : 90), []),
    updateZoom: useCallback((delta: number) => {
      setZoomPercent((current) => Math.max(60, Math.min(250, current + delta)));
    }, []),
  };
}
