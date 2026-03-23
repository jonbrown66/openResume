import type { ResumeDraft } from '../types/resume';
import type { ResumeThemeConfig } from '../types/theme';

export type ExportFormat = 'pdf' | 'word' | 'html';

const API_BASE = '/api';

async function buildExportHtml(
  canvasElement: HTMLDivElement,
  draft: ResumeDraft,
  theme?: ResumeThemeConfig,
  template?: string,
  centered: boolean = false
): Promise<string> {
  const origin = window.location.origin;
  const styleElements: string[] = [];
  
  document.querySelectorAll('style').forEach(style => {
    styleElements.push(style.outerHTML);
  });
  
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    styleElements.push(link.outerHTML);
  });
  
  const styleNodes = styleElements.join('\n');

  const bodyStyle = centered 
    ? `background: #f3f4f6; display: flex; justify-content: center; padding: 24px;`
    : `background: transparent; display: block; padding: 0; margin: 0;`;

  const paperStyle = centered
    ? `width: 210mm; min-height: 297mm; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.12);`
    : `background: transparent;`;

  return `<!DOCTYPE html>
<html lang="zh-CN" class="light">
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
        transform: none !important;
        width: 100% !important;
        height: 100% !important;
      }
    }
    body { ${bodyStyle} }
    .resume-paper { ${paperStyle} }
  </style>
</head>
<body class="bg-white">
  ${canvasElement.outerHTML}
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
    const html = await buildExportHtml(canvasElement, draft, theme, template);
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
    const html = await buildExportHtml(canvasElement, draft, theme, template, true);
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
