import { NextRequest, NextResponse } from 'next/server';
import { ExportRequestError, readExportRequest, safeFilename, sanitizeExportHtml } from '@/lib/exportRequest';
export async function POST(request: NextRequest) {
  try {
    const body = await readExportRequest(request);
    return new NextResponse(sanitizeExportHtml(body.html), { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': safeFilename(body.filename, 'html'),
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:",
      'Cache-Control': 'no-store',
    } });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid export request' }, { status: error instanceof ExportRequestError ? error.status : 500 });
  }
}
