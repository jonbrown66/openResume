import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { buildDocx } from '@/lib/docx';
import { isResumeDraft, normalizeTheme } from '@/utils/validation';
import { ExportRequestError, readExportRequest, safeFilename } from '@/lib/exportRequest';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const body = await readExportRequest(request);
    if (!isResumeDraft(body.draft)) throw new ExportRequestError('Invalid resume draft');
    const theme = normalizeTheme(body.theme);
    const template = typeof body.template === 'string' ? body.template : 'classic';
    if (!['classic', 'minimal', 'standard', 'sidebar'].includes(template)) throw new ExportRequestError('Invalid template');
    const buffer = await Packer.toBuffer(buildDocx(body.draft, theme, template));
    return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': safeFilename(body.filename, 'docx'), 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid or failed Word export' }, { status: error instanceof ExportRequestError ? error.status : 500 });
  }
}
