import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addToast, exportToPdf, exportToWord, exportToHtml } = vi.hoisted(() => ({
  addToast: vi.fn(),
  exportToPdf: vi.fn(),
  exportToWord: vi.fn(),
  exportToHtml: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ addToast }) }));
vi.mock('@/utils/exportResume', () => ({ exportToPdf, exportToWord, exportToHtml }));

import { ExportMenu } from '@/components/ExportMenu';
import { translations } from '@/config/ui';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';

function renderExportMenu(lang: 'en' | 'zh') {
  return render(<ExportMenu canvasRef={{ current: document.createElement('div') }}
    draft={parseMarkdownToResumeDraft('# Resume')} translations={translations[lang]} />);
}

const cases = [
  ['zh', 'pdf', '正在生成 PDF…', 'PDF 已生成，下载已开始'],
  ['zh', 'word', '正在生成 Word 文档…', 'Word 文档已生成，下载已开始'],
  ['zh', 'html', '正在生成 HTML…', 'HTML 已生成，下载已开始'],
  ['en', 'pdf', 'Generating PDF…', 'PDF generated. Download started.'],
  ['en', 'word', 'Generating Word document…', 'Word document generated. Download started.'],
  ['en', 'html', 'Generating HTML…', 'HTML generated. Download started.'],
] as const;

describe('ExportMenu copy', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)('announces %s %s generation and download only after completion', async (lang, format, loading, success) => {
    let complete!: () => void;
    const pending = new Promise<void>(resolve => { complete = resolve; });
    const exporter = { pdf: exportToPdf, word: exportToWord, html: exportToHtml }[format];
    exporter.mockReturnValueOnce(pending);
    const { container } = renderExportMenu(lang);
    const t = translations[lang];
    const label = { pdf: t.exportPdf, word: t.exportWord, html: t.exportHtml }[format];

    fireEvent.click(screen.getByRole('button', { name: t.export }));
    fireEvent.click(await screen.findByRole('menuitem', { name: label }));
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(loading);
    expect(screen.getByRole('button', { name: t.export })).toBeDisabled();
    expect(addToast).not.toHaveBeenCalled();

    await act(async () => { complete(); });
    expect(addToast).toHaveBeenCalledWith(success, 'success');
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(success);
  });

  it('keeps the format and provider error detail when generation fails', async () => {
    exportToPdf.mockRejectedValueOnce(new Error('Preview is still updating. Try exporting again.'));
    const { container } = renderExportMenu('en');
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export PDF' }));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith(
      'Could not generate PDF: Preview is still updating. Try exporting again.', 'error',
    ));
    expect(container.querySelector('[data-export-state]')).toHaveAttribute('data-export-state', 'idle');
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });
});
