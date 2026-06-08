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

/**
 * 克隆多页卡片容器用于 HTML 导出
 * 清除 scale/transition 等屏幕交互样式
 */
function cloneCanvasForExport(canvasElement: HTMLDivElement) {
  const clone = canvasElement.cloneNode(true) as HTMLDivElement;

  clone.style.transform = 'none';
  clone.style.transition = 'none';
  clone.style.width = '210mm';
  clone.style.height = 'auto';
  clone.style.minHeight = '0';
  clone.style.transformOrigin = 'top left';

  clone.classList.add('resume-paper');
  clone.style.display = 'block';

  // 清除内层 scale wrapper 的 transform
  const scaleWrapper = clone.querySelector('.origin-top-left') as HTMLElement | null;
  if (scaleWrapper) {
    scaleWrapper.style.transform = 'none';
    scaleWrapper.style.transition = 'none';
    scaleWrapper.style.width = '210mm';
    scaleWrapper.style.height = 'auto';
  }

  return clone;
}

function cloneSinglePageForHtmlExport(canvasElement: HTMLDivElement) {
  const projectedTemplate =
    canvasElement.querySelector<HTMLElement>('.resume-paper-page-card > div:nth-child(2) > div > .resume-template') ||
    canvasElement.querySelector<HTMLElement>('.resume-template');

  if (!projectedTemplate) {
    return cloneCanvasForExport(canvasElement);
  }

  const paper = document.createElement('div');
  paper.className = 'resume-paper';
  paper.style.width = '210mm';
  paper.style.height = 'auto';
  paper.style.minHeight = '0';
  paper.style.background = 'transparent';
  paper.style.transform = 'none';

  const template = projectedTemplate.cloneNode(true) as HTMLElement;
  template.classList.remove('resume-paper-page-card');
  template.classList.remove('resume-pdf-page');
  template.classList.remove('relative');
  template.classList.remove('overflow-hidden');
  template.classList.remove('rounded-sm');
  template.style.position = 'static';
  template.style.transform = 'none';
  template.style.width = '100%';
  template.style.height = 'auto';
  template.style.minHeight = '0';

  paper.appendChild(template);
  return paper;
}

/**
 * 获取简历纸张底色
 */
function getPaperColor(canvasElement: HTMLDivElement) {
  const template = canvasElement.querySelector('.resume-template') as HTMLElement | null;
  if (!template) return '#faf9f3';
  const computed = window.getComputedStyle(template);
  return computed.getPropertyValue('--resume-paper').trim() || computed.backgroundColor || '#faf9f3';
}

function getCardPageMarginPx(card: HTMLElement) {
  const rawMargin = card.style.getPropertyValue('--page-margin') || '15mm';
  const marginMm = Number.parseFloat(rawMargin);
  return Math.round((Number.isFinite(marginMm) ? marginMm : 15) * 3.78);
}

function syncCardContentOffset(card: HTMLElement) {
  const contentOffset = Number.parseFloat(card.getAttribute('data-content-offset') || '0');
  const pageMarginPx = getCardPageMarginPx(card);
  const viewport = Array.from(card.children).find((child) => child.firstElementChild) as HTMLElement | undefined;
  const contentWrapper = viewport?.firstElementChild as HTMLElement | null | undefined;

  if (!contentWrapper) {
    return;
  }

  contentWrapper.style.position = 'absolute';
  contentWrapper.style.top = `-${pageMarginPx + (Number.isFinite(contentOffset) ? contentOffset : 0)}px`;
  contentWrapper.style.left = '0';
}

/**
 * 构建 PDF 导出的多页卡片 DOM
 */
function buildPdfDocumentForExport(canvasElement: HTMLDivElement) {
  const paperColor = getPaperColor(canvasElement);

  // 1. 深克隆整个多页卡片容器，保持分页投影连续
  const clone = cloneCanvasForExport(canvasElement);

  // 2. 清除屏幕预览专用样式，避免 PDF 页间空隙和阴影
  const cardsForCleanup = Array.from(clone.querySelectorAll<HTMLElement>('.resume-paper-page-card'));
  cardsForCleanup.forEach((card) => {
    card.style.boxShadow = 'none';
    card.style.borderRadius = '0';
    card.style.marginBottom = '0';
    card.classList.remove('shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]');
    card.classList.remove('dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]');
    card.classList.remove('rounded-sm');
    syncCardContentOffset(card);

    const pageIndicator = card.querySelector('.z-40');
    if (pageIndicator) pageIndicator.remove();
  });

  // 3. 为克隆容器设置 PDF 专用类名
  clone.classList.add('resume-pdf-document');
  clone.style.setProperty('--resume-paper', paperColor);
  clone.style.background = paperColor;

  // 4. 为每页卡片设置 PDF 尺寸和分页
  const cards = Array.from(clone.querySelectorAll<HTMLElement>('.resume-paper-page-card'));
  cards.forEach((card) => {
    card.classList.add('resume-pdf-page');
    card.style.width = '210mm';
    card.style.height = '297mm';
    card.style.setProperty('--resume-paper', paperColor);
    card.style.background = paperColor;
  });

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
  const exportCanvas = exportMode === 'pdf'
    ? buildPdfDocumentForExport(canvasElement)
    : cloneSinglePageForHtmlExport(canvasElement);

  const pageMargin = theme?.pageMargin ? `${theme.pageMargin}mm` : '15mm';

  const bodyStyle = centered 
    ? `background: #eef3e7; display: flex; justify-content: center; align-items: flex-start; padding: 24px; margin: 0;`
    : `background: var(--resume-paper, #faf9f3) !important; display: block; padding: 0; margin: 0;`;

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
      @page { size: A4 portrait; margin: ${exportMode === 'pdf' ? '0 !important' : pageMargin}; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: transparent !important; }
      html, body {
        background-color: var(--resume-paper, #faf9f3) !important;
      }
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
      .resume-pdf-page {
        break-after: page !important;
        page-break-after: always !important;
      }
      .resume-pdf-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      .resume-pdf-document, .resume-pdf-document * {
        visibility: visible !important;
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
    [data-export-mode="pdf"] html,
    [data-export-mode="pdf"] body {
      background: var(--resume-paper, #faf9f3) !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    [data-export-mode="pdf"] .resume-pdf-document {
      display: block;
      width: 210mm;
      margin: 0 !important;
      padding: 0 !important;
      background: var(--resume-paper, #faf9f3) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    [data-export-mode="pdf"] .resume-pdf-page {
      position: relative;
      width: 210mm;
      height: 297mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
      background: var(--resume-paper, #faf9f3) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      break-after: page;
      page-break-after: always;
    }
    [data-export-mode="pdf"] .resume-pdf-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    [data-export-mode="pdf"] .resume-paper-page-card {
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    [data-export-mode="pdf"] .resume-template {
      background: var(--resume-paper) !important;
      box-shadow: none !important;
    }
    [data-export-mode="pdf"] .resume-header-classic {
      background: var(--resume-ivory) !important;
    }
    [data-export-mode="pdf"] .resume-content h2::after,
    [data-export-mode="pdf"] .template-classic .resume-content h2::after {
      background: color-mix(in srgb, var(--primary-color) 68%, var(--resume-line)) !important;
    }
    [data-export-mode="pdf"] .origin-top-left {
      transform: none !important;
      transition: none !important;
      width: 210mm !important;
      height: auto !important;
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
