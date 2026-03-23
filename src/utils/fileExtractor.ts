const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
};

const BLOCK_TAGS = new Set([
  'article',
  'div',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'p',
  'section',
]);

export interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

interface PdfTextSegment {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfLine {
  text: string;
  y: number;
  startX: number;
  endX: number;
  height: number;
}

function getFileExtension(file: File): string | null {
  const name = file.name.toLowerCase();
  const extFromName = name.split('.').pop();
  if (extFromName && ['txt', 'md', 'pdf', 'docx'].includes(extFromName)) {
    return extFromName;
  }

  return MIME_TO_EXT[file.type] ?? null;
}

function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('文件大小超过 10MB 限制，请选择更小的文件。');
  }

  const ext = getFileExtension(file);
  if (!ext) {
    throw new Error(`不支持的文件类型：${file.type || '未知'}`);
  }
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanPdfText(text: string) {
  return text
    .replace(/\u00A0/g, ' ') // 不间断空格 → 普通空格
    .replace(/\u200B/g, '') // 零宽空格
    .replace(/\u200C/g, '') // 零宽非连接符
    .replace(/\u200D/g, '') // 零宽连接符
    .replace(/\uFEFF/g, '') // 零宽无断空格 (BOM)
    .replace(/\u2028/g, '\n') // 行分隔符
    .replace(/\u2029/g, '\n\n') // 段落分隔符
    .replace(/[\u2000-\u200A]/g, ' ') // 各种空格字符
    .replace(/[\u202F\u205F\u3000]/g, ' ') // 窄空格、中空格、表意空格
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // 控制字符
}

function buildPdfSegments(items: PdfTextItemLike[]) {
  return items
    .filter((item) => typeof item.str === 'string' && item.str.trim() && Array.isArray(item.transform))
    .map((item) => {
      const transform = item.transform as number[];
      const x = transform[4] ?? 0;
      const y = transform[5] ?? 0;
      const height = Math.abs(item.height ?? transform[0] ?? 12) || 12;
      const width = Math.abs(item.width ?? item.str!.length * (height * 0.5)) || item.str!.length * 6;

      return {
        text: item.str!.trim(),
        x,
        y,
        width,
        height,
      } satisfies PdfTextSegment;
    });
}

function createLinesFromSegments(segments: PdfTextSegment[]) {
  const sorted = [...segments].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const lineTolerance = Math.max(median(sorted.map((segment) => segment.height)) * 0.5, 3);
  const lines: Array<{ y: number; segments: PdfTextSegment[]; height: number }> = [];

  for (const segment of sorted) {
    const currentLine = lines[lines.length - 1];
    if (!currentLine || Math.abs(currentLine.y - segment.y) > lineTolerance) {
      lines.push({
        y: segment.y,
        segments: [segment],
        height: segment.height,
      });
      continue;
    }

    currentLine.segments.push(segment);
    currentLine.height = Math.max(currentLine.height, segment.height);
    currentLine.y = (currentLine.y + segment.y) / 2;
  }

  return lines.map((line) => {
    const orderedSegments = [...line.segments].sort((a, b) => a.x - b.x);
    let text = '';
    let previousEndX: number | null = null;

    for (const segment of orderedSegments) {
      const needsSpace = previousEndX !== null && segment.x - previousEndX > Math.max(segment.height * 0.45, 8);
      text += `${needsSpace ? ' ' : ''}${segment.text}`;
      previousEndX = segment.x + segment.width;
    }

    return {
      text: normalizeWhitespace(text),
      y: line.y,
      startX: orderedSegments[0]?.x ?? 0,
      endX: Math.max(...orderedSegments.map((segment) => segment.x + segment.width)),
      height: line.height,
    } satisfies PdfLine;
  });
}

function splitSegmentsIntoColumns(segments: PdfTextSegment[]) {
  const pageWidth = Math.max(...segments.map((segment) => segment.x + segment.width), 0);
  const leftBoundary = pageWidth * 0.3;
  const rightBoundary = pageWidth * 0.42;
  const leftColumn = segments.filter((segment) => segment.x < leftBoundary);
  const rightColumn = segments.filter((segment) => segment.x >= rightBoundary);

  const uniqueLeftRows = new Set(leftColumn.map((segment) => Math.round(segment.y / 8))).size;
  const uniqueRightRows = new Set(rightColumn.map((segment) => Math.round(segment.y / 8))).size;

  if (leftColumn.length < 2 || rightColumn.length < 2 || uniqueLeftRows < 2 || uniqueRightRows < 2) {
    return [segments];
  }

  return [leftColumn, rightColumn];
}

function serializeColumnLines(lines: PdfLine[]) {
  if (lines.length === 0) {
    return '';
  }

  const orderedLines = [...lines].sort((a, b) => b.y - a.y);
  const gaps = orderedLines
    .slice(1)
    .map((line, index) => orderedLines[index].y - line.y)
    .filter((gap) => gap > 0);
  const baseGap = median(gaps) || median(orderedLines.map((line) => line.height)) || 16;
  const paragraphGap = Math.max(baseGap * 1.6, 18);

  const parts: string[] = [];
  let previousLine: PdfLine | null = null;

  for (const line of orderedLines) {
    if (previousLine) {
      const gap = previousLine.y - line.y;
      parts.push(gap > paragraphGap ? '\n\n' : '\n');
    }
    parts.push(line.text);
    previousLine = line;
  }

  return parts.join('');
}

export function reconstructPdfPageText(items: PdfTextItemLike[]) {
  const segments = buildPdfSegments(items);
  if (segments.length === 0) {
    return '';
  }

  const columns = splitSegmentsIntoColumns(segments).map((columnSegments) =>
    createLinesFromSegments(columnSegments),
  );
  const rawText = columns
    .map((columnLines) => serializeColumnLines(columnLines))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleanPdfText(rawText);
}

function serializeHtmlNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const tagName = node.tagName.toLowerCase();

  if (tagName === 'br') {
    return '\n';
  }

  if (tagName === 'li') {
    const content = normalizeWhitespace(Array.from(node.childNodes).map(serializeHtmlNode).join(''));
    return content ? `- ${content}\n` : '';
  }

  if (tagName === 'tr') {
    const cells = Array.from(node.children)
      .map((child) => normalizeWhitespace(serializeHtmlNode(child)))
      .filter(Boolean);
    return cells.length > 0 ? `${cells.join(' | ')}\n` : '';
  }

  const childText = Array.from(node.childNodes).map(serializeHtmlNode).join('');
  const normalized = tagName === 'pre' ? childText.trim() : normalizeWhitespace(childText);

  if (BLOCK_TAGS.has(tagName)) {
    return normalized ? `${normalized}\n\n` : '';
  }

  if (tagName === 'ul' || tagName === 'ol' || tagName === 'table') {
    return childText.trim() ? `${childText.trim()}\n\n` : '';
  }

  return normalized;
}

export function convertDocxHtmlToText(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const text = Array.from(doc.body.childNodes).map(serializeHtmlNode).join('');
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let pdfjsLoadPromise: Promise<any> | null = null;

async function loadPdfJsFromCdn(): Promise<any> {
  if (pdfjsLoadPromise) {
    return pdfjsLoadPromise;
  }

  pdfjsLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PDF extraction only works in browser'));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as Window & { pdfjsLib?: unknown }).pdfjsLib;
      if (pdfjsLib) {
        (pdfjsLib as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      } else {
        reject(new Error('Failed to load pdf.js'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
}

export async function extractTextFromFile(file: File): Promise<string> {
  validateFile(file);

  const ext = getFileExtension(file) || file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'txt' || ext === 'md') {
    return file.text();
  }

  if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await loadPdfJsFromCdn();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = reconstructPdfPageText(textContent.items as PdfTextItemLike[]);
      if (pageText) {
        pages.push(pageText);
      }
    }

    return pages.join('\n\n').trim();
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const structuredText = convertDocxHtmlToText(result.value);

    if (structuredText) {
      return structuredText;
    }

    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    return rawTextResult.value.trim();
  }

  throw new Error(`不支持的文件类型：${ext}`);
}
