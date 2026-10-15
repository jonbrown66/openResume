import type { ResumeDraft } from '../types/resume';
import type { ResumeThemeConfig } from '../types/theme';

export type ExportFormat = 'pdf' | 'word' | 'html';

const API_BASE = '/api';

function coversGlyphs(range: string, codePoints: number[]) {
  if (!range) return true;
  return range.split(',').some(part => {
    const [start, end] = part.trim().replace(/^U\+/i, '').split('-');
    const lower = parseInt(start.replace(/\?/g, '0'), 16);
    const upper = parseInt((end ?? start).replace(/\?/g, 'F'), 16);
    return codePoints.some(point => point >= lower && point <= upper);
  });
}
async function collectExportStyles(fontFamily?: string, text = '', includeCjk = false) {
  const codePoints = Array.from(new Set(Array.from(text, character => character.codePointAt(0)!)));
  const styleElements: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = await Promise.all(Array.from(sheet.cssRules).map(async rule => {
        if (rule.type === 5) {
          const face = (rule as CSSFontFaceRule).style;
          const selected = (fontFamily && face.fontFamily.includes(fontFamily)) || (includeCjk && face.fontFamily.includes('Noto Sans SC'));
          if (!selected || !coversGlyphs(face.getPropertyValue('unicode-range'), codePoints)) return '';
          let css = rule.cssText;
          const sources = Array.from(css.matchAll(/url\(["']?([^"')]+)["']?\)/g));
          const match = sources.find(source => /\.woff2(?:\?|$)/i.test(source[1])) ?? sources[0];
          if (match) {
            const url = new URL(match[1], window.location.origin);
            if (url.origin !== window.location.origin) return css;
            const response = await fetch(url.href, { signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error('Font could not be embedded');
            const data = await blobDataUrl(await response.blob());
            css = css.replace(/\bsrc\s*:[^;]+;/, `src: url("${data}") format("${/\.woff2/i.test(url.pathname) ? 'woff2' : 'woff'}");`);
          }
          return css;
        }
        return rule.cssText.startsWith('@import') ? '' : rule.cssText;
      }));
      const cssText = rules.filter(Boolean).join('\n');

      if (cssText) {
        styleElements.push(`<style>${cssText}</style>`);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'SecurityError')) throw error;
      const ownerNode = sheet.ownerNode as HTMLElement | null;
      if (ownerNode?.tagName === 'LINK' || ownerNode?.tagName === 'STYLE') {
        styleElements.push(ownerNode.outerHTML);
      }
    }
  }

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
    document.querySelector<HTMLElement>(`[data-resume-measure-id="${canvasElement.dataset.measureId}"] .resume-template`) ||
    canvasElement.parentElement?.querySelector<HTMLElement>('.resume-measure .resume-template') ||
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
  const sourceOffset = Number.parseFloat(card.getAttribute('data-source-offset') ?? '');
  contentWrapper.style.top = `-${Number.isFinite(sourceOffset) ? sourceOffset : pageMarginPx + (Number.isFinite(contentOffset) ? contentOffset : 0)}px`;
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
  const measure = document.querySelector<HTMLElement>(`[data-resume-measure-id="${canvasElement.dataset.measureId}"]`);
  const text = measure?.innerText ?? canvasElement.textContent ?? '';
  const includeCjk = /[\u2e80-\u9fff]/.test(text);
  if (includeCjk) {
    await import('@fontsource/noto-sans-sc/400.css');
    await document.fonts.load('14px "Noto Sans SC"', text);
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
  const deadline = Date.now() + 5000;
  while (canvasElement.dataset.paginationReady === 'false') {
    if (Date.now() > deadline) throw new Error('Preview is still updating. Try exporting again.');
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  const origin = window.location.origin;
  const styleNodes = await collectExportStyles(theme?.fontFamily, text, includeCjk);
  const exportCanvas = exportMode === 'pdf'
    ? buildPdfDocumentForExport(canvasElement)
    : cloneSinglePageForHtmlExport(canvasElement);
  for (const img of Array.from(exportCanvas.querySelectorAll<HTMLImageElement>('img'))) {
    if (img.src && !img.src.startsWith('data:')) {
      const response = await fetch(img.src, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Image could not be embedded');
      img.src = await blobDataUrl(await response.blob());
    }
  }

  const pageMargin = theme?.pageMargin ? `${theme.pageMargin}mm` : '15mm';

  const bodyStyle = centered
    ? `background: #eef3e7; display: flex; justify-content: center; align-items: flex-start; padding: 24px; margin: 0;`
    : `background: var(--resume-paper, #faf9f3) !important; display: block; padding: 0; margin: 0;`;

  const paperStyle = centered
    ? `width: 210mm; height: auto; min-height: 0; background: transparent; box-shadow: 0 10px 30px rgba(0,0,0,0.12); transform: none !important;`
    : `width: 210mm; height: auto; min-height: 0; background: transparent; transform: none !important; box-shadow: none !important;`;

  return `<!DOCTYPE html>
<html lang="${document.documentElement.lang === 'en' ? 'en' : 'zh-CN'}" class="light" data-export-mode="${exportMode}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">
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
    [data-export-mode="pdf"] .resume-paper-page-card.template-sidebar::before,
    [data-export-mode="pdf"] .resume-pdf-page.template-sidebar::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 32%;
      background: color-mix(in srgb, var(--primary-color) 4%, #f8fafc);
      border-right: 1px solid color-mix(in srgb, var(--primary-color) 14%, var(--resume-line));
      pointer-events: none;
      z-index: 1;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    [data-export-mode="pdf"] .resume-paper-page-card.template-sidebar .template-sidebar,
    [data-export-mode="pdf"] .resume-pdf-page.template-sidebar .template-sidebar,
    [data-export-mode="pdf"] .template-sidebar.resume-template {
      background: transparent !important;
    }
    [data-export-mode="pdf"] .resume-paper-page-card.template-sidebar .sidebar-aside,
    [data-export-mode="pdf"] .resume-pdf-page.template-sidebar .sidebar-aside {
      background: transparent !important;
      border-right-color: transparent !important;
    }
    [data-export-mode="pdf"] .resume-header-classic {
      background: var(--resume-ivory) !important;
    }
    [data-export-mode="pdf"] .resume-content h2::after,
    [data-export-mode="pdf"] .template-classic .resume-content h2::after {
      background: color-mix(in srgb, var(--primary-color) 68%, var(--resume-line)) !important;
    }
    [data-export-mode="pdf"] [data-font-family*="细圆"] .resume-content,
    [data-export-mode="pdf"] [data-font-family*="柔黑"] .resume-content,
    [data-export-mode="pdf"] [data-font-family*="Rounded"] .resume-content {
      font-size: calc(var(--font-size, 10pt) * 1.04) !important;
      font-weight: 300 !important;
      letter-spacing: 0.02em !important;
    }
    [data-export-mode="pdf"] [data-font-family*="细圆"] .resume-content p,
    [data-export-mode="pdf"] [data-font-family*="柔黑"] .resume-content p,
    [data-export-mode="pdf"] [data-font-family*="Rounded"] .resume-content p,
    [data-export-mode="pdf"] [data-font-family*="细圆"] .resume-content li,
    [data-export-mode="pdf"] [data-font-family*="柔黑"] .resume-content li,
    [data-export-mode="pdf"] [data-font-family*="Rounded"] .resume-content li {
      font-weight: 300 !important;
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
    signal: AbortSignal.timeout(65000),
    body: JSON.stringify({
      html,
      filename,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const blob = await response.blob();
  downloadBlob(blob, filename, extension);
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not embed resource')); reader.readAsDataURL(blob);
  });
}
function downloadBlob(blob: Blob, filename: string, extension: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    throw new Error('PDF export failed. Please try again or use HTML export.');
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
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), draft.frontmatter.name || 'resume', 'html');
  } catch (error) {
    console.error('HTML export failed:', error);
    throw new Error('HTML export failed. Please try again.');
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
      signal: AbortSignal.timeout(65000),
      body: JSON.stringify({
        draft,
        template,
        theme,
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
