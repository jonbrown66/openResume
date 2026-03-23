import puppeteer, { type Browser, type Page } from 'puppeteer-core';

export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

export const BROWSER_CONFIG = {
  maxInstances: 3,
  instanceTimeout: 60000,
  pageTimeout: 30000,
  idleTimeout: 300000,
};

let cachedBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let lastUsedTime = 0;

export const activePages = new Set<Page>();

export function getLocalExecutablePath(): string | null {
  const fs = require('fs');
  const path = require('path');
  
  const winPaths = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google\\Chrome\\Application\\chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google\\Chrome\\Application\\chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft\\Edge\\Application\\msedge.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft\\Edge\\Application\\msedge.exe'),
  ].filter(Boolean) as string[];

  for (const p of winPaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

export async function closeAllPages(): Promise<void> {
  for (const page of activePages) {
    try {
      await page.close();
    } catch {}
  }
  activePages.clear();
}

export async function closeBrowser(): Promise<void> {
  if (cachedBrowser) {
    await closeAllPages();
    try {
      await cachedBrowser.close();
    } catch {}
    cachedBrowser = null;
    browserPromise = null;
    lastUsedTime = 0;
  }
}

export async function cleanupBrowser(): Promise<void> {
  if (cachedBrowser && !cachedBrowser.connected) {
    await closeBrowser();
  }
  
  if (cachedBrowser && Date.now() - lastUsedTime > BROWSER_CONFIG.idleTimeout) {
    await closeBrowser();
  }
}

export async function getBrowser(): Promise<Browser> {
  await cleanupBrowser();
  
  if (cachedBrowser && cachedBrowser.connected) {
    lastUsedTime = Date.now();
    return cachedBrowser;
  }

  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = (async () => {
    const localPath = process.env.CHROME_PATH || getLocalExecutablePath();
    
    if (localPath) {
      cachedBrowser = await puppeteer.launch({
        executablePath: localPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
        ],
        headless: true,
        defaultViewport: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
      });
    } else {
      const chromium = await import('@sparticuz/chromium');
      cachedBrowser = await puppeteer.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar',
        ),
        headless: true,
        defaultViewport: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
      });
    }

    cachedBrowser.on('disconnected', () => {
      cachedBrowser = null;
      browserPromise = null;
    });

    lastUsedTime = Date.now();
    return cachedBrowser;
  })();

  return browserPromise;
}

export async function createPage(): Promise<Page> {
  const browser = await getBrowser();
  
  const browserPageCount = (await browser.pages()).length;
  if (browserPageCount >= BROWSER_CONFIG.maxInstances) {
    throw new Error('Server busy, try again later');
  }

  const page = await browser.newPage();
  activePages.add(page);
  
  return page;
}

export async function closePage(page: Page | null): Promise<void> {
  if (page) {
    activePages.delete(page);
    await page.close().catch(() => {});
  }
}

setInterval(() => {
  cleanupBrowser().catch(console.error);
}, 60000);
