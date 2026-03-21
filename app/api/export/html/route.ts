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

    try {
      await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      await page.evaluate(() => {
        return document.fonts.ready.then(() => {});
      });

      const htmlContent = await page.content();

      const encodedFilename = encodeURIComponent(`${filename}.html`);
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    } finally {
      await closePage(page);
    }
  } catch (error) {
    console.error('HTML generation error:', error);
    return NextResponse.json({ error: 'Failed to generate HTML' }, { status: 500 });
  }
}
