import { NextRequest, NextResponse } from 'next/server';
import { BrowserBusyError, withExportPage } from '@/lib/puppeteer';
import { ExportRequestError, readExportRequest, safeFilename, sanitizeExportHtml } from '@/lib/exportRequest';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const body = await readExportRequest(request);
    const html = sanitizeExportHtml(body.html);
    const pdf = await withExportPage(async page => {
      await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => document.fonts.ready);
      return page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    });
    return new NextResponse(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf',
      'Content-Disposition': safeFilename(body.filename, 'pdf'), 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof ExportRequestError ? error.status : error instanceof BrowserBusyError ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? 'Failed to generate PDF' : (error as Error).message }, { status });
  }
}
