import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileType, FileCode } from 'lucide-react';
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

export const ExportMenu = memo(function ExportMenu({ 
  canvasRef, 
  draft, 
  translations, 
  children, 
  theme, 
  template 
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleExport = async (format: 'pdf' | 'word' | 'html') => {
    if (!canvasRef.current) {
      addToast(translations.exportNoPreview, 'warning');
      return;
    }
    
    setIsExporting(true);
    setIsOpen(false);
    try {
      switch (format) {
        case 'pdf':
          await exportToPdf(canvasRef.current, draft, theme, template);
          addToast(translations.exportPdfSuccess, 'success');
          break;
        case 'word':
          await exportToWord(canvasRef.current, draft);
          addToast(translations.exportWordSuccess, 'success');
          break;
        case 'html':
          await exportToHtml(canvasRef.current, draft);
          addToast(translations.exportHtmlSuccess, 'success');
          break;
      }
    } catch (error) {
      addToast(error instanceof Error ? `${translations.exportFailed}: ${error.message}` : translations.exportFailed, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    { format: 'pdf' as const, label: translations.exportPdf, icon: FileType },
    { format: 'word' as const, label: translations.exportWord, icon: FileText },
    { format: 'html' as const, label: translations.exportHtml, icon: FileCode },
  ];

  return (
    <div ref={menuRef} className="relative">
      <div onClick={() => !isExporting && setIsOpen(!isOpen)}>{children}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ ...dynamicIslandSpring, stiffness: 300 }}
            className="absolute right-0 mt-2 w-52 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/8 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/10 py-2 z-50 overflow-hidden"
          >
            {exportOptions.map((option, index) => (
              <motion.button
                key={option.format}
                onClick={() => handleExport(option.format)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...dynamicIslandSpring, stiffness: 300, delay: index * 0.04 }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
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
