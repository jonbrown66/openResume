const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  txt: ['text/plain'],
  md: ['text/plain', 'text/markdown'],
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
};

const MIME_TO_EXT: Record<string, string> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
};

function getFileExtension(file: File): string | null {
  const name = file.name.toLowerCase();
  const extFromName = name.split('.').pop();
  if (extFromName && ['txt', 'md', 'pdf', 'docx'].includes(extFromName)) {
    return extFromName;
  }
  
  const mimeExt = MIME_TO_EXT[file.type];
  if (mimeExt) {
    return mimeExt;
  }
  
  return null;
}

function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小超过 10MB 限制，请选择更小的文件。`);
  }
  
  const ext = getFileExtension(file);
  if (!ext) {
    throw new Error(`不支持的文件类型：${file.type || '未知'}`);
  }
}

let pdfjsLoadPromise: Promise<any> | null = null;

async function loadPdfJsFromCdn(): Promise<any> {
  if (pdfjsLoadPromise) {
    return pdfjsLoadPromise;
  }
  
  pdfjsLoadPromise = new Promise(async (resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PDF extraction only works in browser'));
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = async () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
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
    
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error(`不支持的文件类型：${ext}`);
}
