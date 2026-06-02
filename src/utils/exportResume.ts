import type { ResumeDraft } from '../types/resume';
import type { ResumeThemeConfig } from '../types/theme';

export type ExportFormat = 'pdf' | 'word' | 'html';

const API_BASE = '/api';

function collectExportStyles() {
  const styleElements: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const cssText = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');

      if (cssText) {
        styleElements.push(`<style>${cssText}</style>`);
      }
    } catch {
      const ownerNode = sheet.ownerNode as HTMLElement | null;
      if (ownerNode?.tagName === 'LINK' || ownerNode?.tagName === 'STYLE') {
        styleElements.push(ownerNode.outerHTML);
      }
    }
  }

  document.querySelectorAll('style').forEach((style) => {
    if (!styleElements.includes(style.outerHTML)) {
      styleElements.push(style.outerHTML);
    }
  });

  return styleElements.join('\n');
}

function cloneCanvasForExport(canvasElement: HTMLDivElement) {
  const clone = canvasElement.cloneNode(true) as HTMLDivElement;

  clone.style.transform = 'none';
  clone.style.transition = 'none';
  clone.style.width = '210mm';
  clone.style.height = 'auto';
  clone.style.minHeight = '0';
  clone.style.transformOrigin = 'top left';
  clone.classList.remove('hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)]');
  clone.classList.remove('dark:hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)]');

  return clone;
}

async function buildExportHtml(
  canvasElement: HTMLDivElement,
  draft: ResumeDraft,
  theme?: ResumeThemeConfig,
  template?: string,
  centered: boolean = false,
  exportMode: 'pdf' | 'html' = 'pdf'
): Promise<string> {
  const origin = window.location.origin;
  const styleNodes = collectExportStyles();
  const exportCanvas = cloneCanvasForExport(canvasElement);

  const bodyStyle = centered 
    ? `background: #eef3e7; display: flex; justify-content: center; align-items: flex-start; padding: 24px; margin: 0;`
    : `background: transparent; display: block; padding: 0; margin: 0;`;

  const paperStyle = centered
    ? `width: 210mm; height: auto; min-height: 0; background: transparent; box-shadow: 0 10px 30px rgba(0,0,0,0.12); transform: none !important;`
    : `width: 210mm; height: auto; min-height: 0; background: transparent; transform: none !important; box-shadow: none !important;`;

  return `<!DOCTYPE html>
<html lang="zh-CN" class="light" data-export-mode="${exportMode}">
<head>
  <meta charset="UTF-8">
  <base href="${origin}">
  ${styleNodes}
  <style>
    @media print {
      @page { size: A4; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: transparent !important; }
      .resume-paper { 
        box-shadow: none !important; 
        margin: 0 !important; 
        padding: 0 !important;
        position: static !important;
        transform: none !important;
        width: 210mm !important;
        height: auto !important;
        min-height: 0 !important;
      }
    }
    html { background: transparent !important; }
    body { ${bodyStyle} }
    .resume-paper { ${paperStyle} }
    .resume-paper > .resume-template {
      width: 100%;
      min-height: 0 !important;
    }
    [data-export-mode="pdf"] .resume-paper,
    [data-export-mode="pdf"] .resume-template,
    [data-export-mode="pdf"] .resume-avatar {
      box-shadow: none !important;
      filter: none !important;
      backdrop-filter: none !important;
    }
    [data-export-mode="pdf"] .resume-template {
      background: var(--resume-paper) !important;
    }
    [data-export-mode="pdf"] .resume-header-classic {
      background: var(--resume-ivory) !important;
    }
    [data-export-mode="pdf"] .resume-content h2::after,
    [data-export-mode="pdf"] .template-classic .resume-content h2::after {
      background: color-mix(in srgb, var(--primary-color) 68%, var(--resume-line)) !important;
    }
  </style>
</head>
<body class="bg-white">
  ${exportCanvas.outerHTML}
</body>
</html>`;
}

async function fetchExport(apiPath: string, html: string, filename: string, mimeType: string, extension: string): Promise<void> {
  const response = await fetch(`${API_BASE}${apiPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      filename,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPdf(
  canvasElement: HTMLDivElement, 
  draft: ResumeDraft, 
  theme?: ResumeThemeConfig,
  template?: string
): Promise<void> {
  try {
    const html = await buildExportHtml(canvasElement, draft, theme, template, false, 'pdf');
    await fetchExport('/export/pdf', html, draft.frontmatter.name || 'resume', 'application/pdf', 'pdf');
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('PDF export failed. Please make sure the export server is running (npm run server).');
  }
}

export async function exportToHtml(
  canvasElement: HTMLDivElement, 
  draft: ResumeDraft, 
  theme?: ResumeThemeConfig,
  template?: string
): Promise<void> {
  try {
    const html = await buildExportHtml(canvasElement, draft, theme, template, true, 'html');
    await fetchExport('/export/html', html, draft.frontmatter.name || 'resume', 'text/html', 'html');
  } catch (error) {
    console.error('HTML export failed:', error);
    throw new Error('HTML export failed. Please make sure the export server is running (npm run server).');
  }
}

export async function exportToWord(
  canvasElement: HTMLDivElement, 
  draft: ResumeDraft, 
  theme?: ResumeThemeConfig,
  template?: string
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft,
        template,
        filename: draft.frontmatter.name || 'resume',
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.frontmatter.name || 'resume'}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Word export failed:', error);
    throw new Error('Word export failed. Please try again.');
  }
}
