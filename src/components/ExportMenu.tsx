import { useState, useRef, useEffect, memo, Children, cloneElement, isValidElement, type ReactElement, type ButtonHTMLAttributes } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { FileText, FileType, FileCode, Loader2, Check } from 'lucide-react';
import type { TranslationSet } from '@/config/ui';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';
import { exportToPdf, exportToWord, exportToHtml } from '@/utils/exportResume';
import { useToast } from '@/components/ui/Toast';
import { overlayTransition } from '@/lib/motion';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';

interface ExportMenuProps {
  markdown?: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  translations: TranslationSet;
  children: React.ReactNode;
  theme?: ResumeThemeConfig;
  template?: string;
}

type ExportState = 'idle' | 'exporting' | 'success';

export const ExportMenu = memo(function ExportMenu({
  markdown,
  canvasRef,
  draft,
  translations,
  children,
  theme,
  template
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => surfaceRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const close = () => setIsOpen(false);
    window.addEventListener('resize', close);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', close); };
  }, [isOpen]);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportFormat, setExportFormat] = useState<string>('');
  const { addToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !surfaceRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleExport = async (format: 'pdf' | 'word' | 'html') => {
    if (!canvasRef.current || exportState === 'exporting') {
      if (!canvasRef.current) {
        addToast(translations.exportNoPreview, 'warning');
      }
      return;
    }

    setExportState('exporting');
    setExportFormat(format.toUpperCase());
    setIsOpen(false);

    try {
      // An explicit export always reads the current text, even while the
      // background preview is still processing the preceding revision.
      const exportDraft = markdown === undefined ? draft : parseMarkdownToResumeDraft(markdown);
      switch (format) {
        case 'pdf':
          await exportToPdf(canvasRef.current, exportDraft, theme, template);
          break;
        case 'word':
          await exportToWord(canvasRef.current, exportDraft, theme, template);
          break;
        case 'html':
          await exportToHtml(canvasRef.current, exportDraft, theme, template);
          break;
      }

      setExportState('success');
      addToast(translations.exportSuccess, 'success');

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setExportState('idle');
      }, 2000);

    } catch (error) {
      setExportState('idle');
      addToast(error instanceof Error ? `${translations.exportFailed}: ${error.message}` : translations.exportFailed, 'error');
    }
  };

  const exportOptions = [
    { format: 'pdf' as const, label: translations.exportPdf, icon: FileType },
    { format: 'word' as const, label: translations.exportWord, icon: FileText },
    { format: 'html' as const, label: translations.exportHtml, icon: FileCode },
  ];

  const anchor = isOpen ? triggerRef.current?.getBoundingClientRect() : null;
  const icon = exportState === 'exporting' ? <Loader2 key="status" size={16} className="animate-spin" /> : <Check key="status" size={16} />;
  return (
    <div ref={menuRef} className="relative" data-export-state={exportState} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (!isOpen) { triggerRef.current = (event.target as Element).closest('button'); setIsOpen(true); return; }
      const items = Array.from(surfaceRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? []);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      items[next]?.focus();
    }}>
      {Children.map(children, child => {
        if (!isValidElement(child)) return child;
        const button = child as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
        const contents = Children.toArray(button.props.children);
        if (exportState !== 'idle') {
          const original = contents[0] as ReactElement<{ size?: number }>;
          contents[0] = cloneElement(icon, { size: isValidElement(original) ? original.props.size ?? 16 : 16 });
        }
        return cloneElement(button, { ...button.props,
          'aria-haspopup': 'menu', 'aria-expanded': isOpen, 'aria-busy': exportState === 'exporting',
          disabled: exportState === 'exporting',
          onClick: event => { triggerRef.current = event.currentTarget; setIsOpen(value => !value); },
        }, contents);
      })}
      <span className="sr-only" aria-live="polite">{exportState === 'exporting' ? translations.exporting : exportState === 'success' ? `${exportFormat} ${translations.exportSuccess}` : ''}</span>
      {createPortal(<AnimatePresence>{isOpen && <motion.div ref={surfaceRef} role="menu" aria-label={translations.export}
        initial={{ opacity: 0, y: reduced ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -2 }} transition={overlayTransition}
        className="app-ui app-panel ui-menu fixed z-[120] w-52 overflow-y-auto p-1.5" style={{
          top: Math.max(12, Math.min((anchor?.bottom ?? 56) + 8, window.innerHeight - 180)),
          left: Math.max(12, Math.min((anchor?.right ?? window.innerWidth - 12) - 208, window.innerWidth - 220)),
          maxHeight: 'calc(100dvh - 24px)', transformOrigin: 'top right',
        }}>
        {exportOptions.map(option => <button key={option.format} type="button" role="menuitem" onClick={() => handleExport(option.format)}
          className="app-control ui-menu-item">
          <option.icon size={16} /><span>{option.label}</span>
        </button>)}
      </motion.div>}</AnimatePresence>, document.body)}
    </div>
  );
});
