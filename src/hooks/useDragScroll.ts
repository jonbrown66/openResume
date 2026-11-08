import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';

interface DragState {
  active: boolean;
  startX: number;
  startScroll: number;
  moved: boolean;
}

/**
 * Horizontal drag-to-scroll for a single-line strip.
 * Mouse and pen drag the strip; touch keeps the browser's native pan.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [scrollable, setScrollable] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState>({ active: false, startX: 0, startScroll: 0, moved: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollable(max > 1);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(max <= 1 || el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer?.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure]);

  const onPointerDown = (event: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (!el || event.pointerType === 'touch' || event.button !== 0 || el.scrollWidth <= el.clientWidth) return;
    drag.current = { active: true, startX: event.clientX, startScroll: el.scrollLeft, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    if (event.buttons === 0) {
      drag.current.active = false;
      setDragging(false);
      return;
    }
    const delta = event.clientX - drag.current.startX;
    if (!drag.current.moved) {
      if (Math.abs(delta) <= 3) return;
      // Capture only once a drag starts, so a plain click still reaches the swatch.
      drag.current.moved = true;
      setDragging(true);
      el.setPointerCapture(event.pointerId);
    }
    el.scrollLeft = drag.current.startScroll - delta;
    event.preventDefault();
  };

  const finishDrag = (event: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    drag.current.active = false;
    setDragging(false);
    // Reset after the click that ends this gesture, so a drag that produces no
    // click cannot swallow the next one.
    window.setTimeout(() => { drag.current.moved = false; }, 0);
  };

  // Swallow the click that ends a drag so it never selects a swatch.
  const onClickCapture = (event: ReactMouseEvent<T>) => {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  };

  return {
    ref,
    scrollable,
    atStart,
    atEnd,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onClickCapture,
    },
  };
}
