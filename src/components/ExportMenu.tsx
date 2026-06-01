import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileType, FileCode, Loader2, Check } from 'lucide-react';
import type { TranslationSet } from '@/config/ui';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';
import { exportToPdf, exportToWord, exportToHtml } from '@/utils/exportResume';
import { useToast } from '@/components/ui/Toast';
import { dynamicIslandSpring } from '@/lib/motion';

interface ExportMenuProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  translations: TranslationSet;
  children: React.ReactNode;
  theme?: ResumeThemeConfig;
  template?: string;
}

type ExportState = 'idle' | 'exporting' | 'success';

export const ExportMenu = memo(function ExportMenu({ 
  canvasRef, 
  draft, 
  translations, 
  children, 
  theme, 
  template 
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportFormat, setExportFormat] = useState<string>('');
  const { addToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
      switch (format) {
        case 'pdf':
          await exportToPdf(canvasRef.current, draft, theme, template);
          break;
        case 'word':
          await exportToWord(canvasRef.current, draft);
          break;
        case 'html':
          await exportToHtml(canvasRef.current, draft);
          break;
      }
      
      setExportState('success');
      
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

  return (
    <div ref={menuRef} className="relative">
      <AnimatePresence mode="wait">
        {exportState === 'exporting' ? (
          <motion.div
            key="exporting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={dynamicIslandSpring}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg"
          >
            <Loader2 size={16} className="animate-spin text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {translations.exporting}
            </span>
          </motion.div>
        ) : exportState === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={dynamicIslandSpring}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 dark:bg-green-400/10 rounded-lg"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              <Check size={16} className="text-green-500" />
            </motion.div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {exportFormat} {translations.exportSuccess}
            </span>
          </motion.div>
        ) : (
          <div onClick={() => setIsOpen(!isOpen)}>{children}</div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isOpen && exportState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ ...dynamicIslandSpring, stiffness: 300 }}
            className="app-panel absolute right-0 mt-2 w-52 rounded-xl border py-2 z-50 overflow-hidden"
          >
            {exportOptions.map((option, index) => (
              <motion.button
                key={option.format}
                onClick={() => handleExport(option.format)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...dynamicIslandSpring, stiffness: 300, delay: index * 0.04 }}
                className="app-control flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <option.icon size={16} className="text-zinc-400 dark:text-zinc-500" />
                <span className="font-medium">{option.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
