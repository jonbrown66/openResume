import { useLayoutEffect, useRef, useState, type PropsWithChildren, type RefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCompactViewport } from '@/hooks/useCompactViewport';
import { useOverlayDialog } from '@/hooks/useOverlayDialog';
import { overlayTransition } from '@/lib/motion';

interface Props extends PropsWithChildren {
  title: string;
  closeLabel: string;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  anchorRect?: DOMRect | null;
  width?: number;
  footer?: ReactNode;
  compactPanel?: boolean;
}

export function AnchoredPanel({ title, closeLabel, onClose, triggerRef, anchorRect, width = 336, children, footer, compactPanel = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const compact = useCompactViewport();
  const reduced = useReducedMotion();
  const [position, setPosition] = useState({ top: 72, left: 12, maxHeight: 400 });
  useOverlayDialog(true, ref, onClose, compact, triggerRef);
  useLayoutEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport?.offsetTop ?? 0;
      const rect = triggerRef.current?.isConnected ? triggerRef.current.getBoundingClientRect() : anchorRect;
      const top = compact && !compactPanel ? offset + 12 : Math.max(offset + 12, Math.min(rect?.bottom ?? 64, height + offset - (compactPanel ? 340 : 180)) + 8);
      setPosition({ top, left: Math.max(12, Math.min((rect?.right ?? window.innerWidth - 12) - width, window.innerWidth - width - 12)), maxHeight: Math.max(120, height + offset - top - 12) });
    };
    update(); window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [compact, compactPanel, triggerRef, anchorRect, width]);
  return createPortal(<div className="app-ui ui-overlay-root" data-overlay-portal>
    {compact && <div className="ui-backdrop" style={compactPanel ? { background: 'transparent' } : undefined} onMouseDown={onClose} />}
    <motion.div ref={ref} role="dialog" aria-modal={compact} aria-label={title} tabIndex={-1}
      data-compact-panel={compactPanel || undefined}
      className="app-panel ui-anchored-panel" style={{ ...position, width: compact && !compactPanel ? undefined : width, transformOrigin: 'top right' }}
      initial={{ opacity: 0, y: reduced ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -2 }} transition={overlayTransition}>
      <div className="ui-panel-heading"><h2>{title}</h2><button type="button" className="app-control ui-icon-button" aria-label={closeLabel} onClick={onClose}><X size={18} /></button></div>
      <div className="ui-panel-content">{children}</div>
      {footer && <div className="ui-panel-footer">{footer}</div>}
    </motion.div>
  </div>, document.body);
}
