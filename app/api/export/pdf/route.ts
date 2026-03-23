import { NextRequest, NextResponse } from 'next/server';
import { getBrowser, createPage, closePage, A4_WIDTH_PX, A4_HEIGHT_PX, BROWSER_CONFIG } from '@/lib/puppeteer';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let page = null;

  try {
    const { html, filename = 'resume' } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'HTML is required' }, { status: 400 });
    }

    const browser = await getBrowser();
    
    const browserPageCount = (await browser.pages()).length;
    if (browserPageCount >= BROWSER_CONFIG.maxInstances) {
      return NextResponse.json({ error: 'Server busy, try again later' }, { status: 503 });
    }

    page = await createPage();
    
    const pageClosePromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Page timeout')), BROWSER_CONFIG.pageTimeout);
    });

    try {
      await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
      
      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
      
      await page.evaluate(() => {
        return document.fonts.ready;
      });

      const pdf = await page.pdf({
        format: 'A4',
        scale: 1,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      const encodedFilename = encodeURIComponent(`${filename}.pdf`);
      return new NextResponse(Buffer.from(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    } finally {
      await closePage(page);
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
