import { useState, useRef, useEffect, memo } from 'react';
import { FileText, FileType, FileCode, Loader2, Check, Printer, ChevronDown } from 'lucide-react';
import type { TranslationSet } from '@/config/ui';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';
import { exportToPdf, exportToWord, exportToHtml } from '@/utils/exportResume';
import { useToast } from '@/components/ui/Toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';

export interface ExportMenuProps {
  markdown?: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  translations: TranslationSet;
  theme?: ResumeThemeConfig;
  template?: string;
}

type ExportState = 'idle' | 'exporting' | 'success';

export const ExportMenu = memo(function ExportMenu({ markdown, canvasRef, draft, translations: t, theme, template }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportFormat, setExportFormat] = useState('');
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToast } = useToast();

  useEffect(() => () => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
  }, []);

  const handleExport = async (format: 'pdf' | 'word' | 'html') => {
    if (!canvasRef.current || exportState === 'exporting') {
      if (!canvasRef.current) addToast(t.exportNoPreview, 'warning');
      return;
    }
    setExportState('exporting');
    setExportFormat(format.toUpperCase());
    setIsOpen(false);
    try {
      // Read the latest text even when the preview is processing an earlier revision.
      const exportDraft = markdown === undefined ? draft : parseMarkdownToResumeDraft(markdown);
      const exporters = { pdf: exportToPdf, word: exportToWord, html: exportToHtml };
      await exporters[format](canvasRef.current, exportDraft, theme, template);
      setExportState('success');
      addToast(t.exportSuccess, 'success');
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setExportState('idle'), 2000);
    } catch (error) {
      setExportState('idle');
      addToast(error instanceof Error ? `${t.exportFailed}: ${error.message}` : t.exportFailed, 'error');
    }
  };

  const options = [
    { format: 'pdf' as const, label: t.exportPdf, icon: FileType },
    { format: 'word' as const, label: t.exportWord, icon: FileText },
    { format: 'html' as const, label: t.exportHtml, icon: FileCode },
  ];
  const Icon = exportState === 'exporting' ? Loader2 : exportState === 'success' ? Check : Printer;

  return (
    <div className="relative" data-export-state={exportState}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger disabled={exportState === 'exporting'} aria-busy={exportState === 'exporting'} aria-label={t.export}
          className="app-primary flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg p-2 lg:min-h-0 lg:px-4 lg:py-2">
          <Icon size={16} className={exportState === 'exporting' ? 'animate-spin' : undefined} />
          <span className="text-xs lg:text-sm">{t.export === '导出简历' ? '导出' : t.export}</span>
          <ChevronDown size={12} className="hidden lg:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={t.export} className="w-52">
          {options.map(option => (
            <DropdownMenuItem key={option.format} render={<button type="button" />} nativeButton
              onClick={() => void handleExport(option.format)}>
              <option.icon size={16} /><span>{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="sr-only" aria-live="polite">
        {exportState === 'exporting' ? t.exporting : exportState === 'success' ? `${exportFormat} ${t.exportSuccess}` : ''}
      </span>
    </div>
  );
});
