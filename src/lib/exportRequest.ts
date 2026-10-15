import type { NextRequest } from 'next/server';
import sanitizeHtml from 'sanitize-html';

export class ExportRequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const MAX_BODY_BYTES = 12 * 1024 * 1024;
export async function readExportRequest(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ExportRequestError('JSON is required', 415);
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ExportRequestError('Export is too large', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ExportRequestError('Request body is required');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new ExportRequestError('Export is too large', 413); }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid object');
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ExportRequestError) throw error;
    throw new ExportRequestError('Invalid JSON');
  } finally { reader.releaseLock(); }
}
export function safeFilename(value: unknown, extension: string) {
  const name = typeof value === 'string' ? value.replace(/[\x00-\x1f<>:"/\\|?*]/g, '').slice(0, 100) : 'resume';
  const encoded = encodeURIComponent(`${name || 'resume'}.${extension}`);
  return `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}
export function sanitizeExportHtml(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ExportRequestError('HTML is required');
  const sanitized = sanitizeHtml(value, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'html', 'head', 'body', 'style', 'img', 'meta'],
    allowedAttributes: { '*': ['class', 'id', 'style', 'lang', 'dir', 'data-*', 'aria-*'],
      img: ['src', 'alt', 'width', 'height'], a: ['href', 'title'], meta: ['charset'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'], allowedSchemesByTag: { img: ['data'] },
    allowVulnerableTags: true, // Style is necessary for pagination; the browser blocks all network and scripts.
    enforceHtmlBoundary: true,
  });
  const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:">';
  return /<head[\s>]/i.test(sanitized) ? sanitized.replace(/<head([^>]*)>/i, `<head$1>${csp}`)
    : `<!doctype html><html><head>${csp}</head><body>${sanitized}</body></html>`;
}
