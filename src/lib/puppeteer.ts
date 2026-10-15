import { chromium as playwrightChromium, type Browser, type Page } from 'playwright-core';
import { existsSync } from 'node:fs';
import path from 'node:path';
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const BROWSER_CONFIG = { maxInstances: 3, instanceTimeout: 20000, pageTimeout: 45000, idleTimeout: 300000 };
let cachedBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let lastUsedTime = 0;
let reservedPages = 0;
export const activePages = new Set<Page>();
export class BrowserBusyError extends Error {}
export function getLocalExecutablePath(): string | null {
  const paths = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    ...[process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].flatMap(root => root
      ? [path.join(root, 'Google/Chrome/Application/chrome.exe'), path.join(root, 'Microsoft/Edge/Application/msedge.exe')] : []),
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  ];
  return paths.find((p): p is string => Boolean(p && existsSync(p))) ?? null;
}
export async function closePage(page: Page | null) {
  if (!page) return;
  if (activePages.delete(page)) reservedPages--;
  await page.close().catch(() => undefined);
  lastUsedTime = Date.now();
}
export async function closeAllPages() { await Promise.all(Array.from(activePages, closePage)); }
export async function closeBrowser() {
  await closeAllPages();
  const browser = cachedBrowser; cachedBrowser = null; browserPromise = null;
  await browser?.close().catch(() => undefined);
}
export async function cleanupBrowser() {
  if (cachedBrowser && (!cachedBrowser.isConnected() || (!reservedPages && Date.now() - lastUsedTime > BROWSER_CONFIG.idleTimeout))) await closeBrowser();
}
export async function getBrowser(): Promise<Browser> {
  await cleanupBrowser();
  lastUsedTime = Date.now();
  if (cachedBrowser?.isConnected()) return cachedBrowser;
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    const localPath = process.env.CHROME_PATH || getLocalExecutablePath();
    const chromium = localPath ? null : (await import('@sparticuz/chromium')).default;
    const browser = await playwrightChromium.launch({
      executablePath: localPath || await chromium!.executablePath('https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar'),
      args: chromium ? chromium.args : ['--disable-dev-shm-usage', '--disable-background-networking', '--no-first-run'],
      headless: true, timeout: BROWSER_CONFIG.instanceTimeout,
      chromiumSandbox: Boolean(localPath),
    });
    cachedBrowser = browser;
    browser.on('disconnected', () => { if (cachedBrowser === browser) { cachedBrowser = null; browserPromise = null; } });
    return browser;
  })();
  try { return await browserPromise; }
  finally { browserPromise = null; }
}
export async function createPage(): Promise<Page> {
  // Reserve synchronously before any await so concurrent callers cannot bypass the limit.
  if (reservedPages >= BROWSER_CONFIG.maxInstances) throw new BrowserBusyError('Server busy, try again later');
  reservedPages++;
  let page: Page | null = null;
  try {
    page = await (await getBrowser()).newPage({ javaScriptEnabled: false, viewport: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX } });
    activePages.add(page);
    await page.route('**/*', route => {
      const url = route.request().url();
      const allowed = url === 'about:blank' || /^data:(image\/(png|jpeg|webp|gif)|font\/|application\/(font|octet-stream))/i.test(url);
      return (allowed ? route.continue() : route.abort()).catch(() => undefined);
    });
    page.setDefaultTimeout(BROWSER_CONFIG.pageTimeout);
    return page;
  } catch (error) {
    if (page && activePages.has(page)) await closePage(page);
    else reservedPages--;
    throw error;
  }
}
export async function withExportPage<T>(work: (page: Page) => Promise<T>): Promise<T> {
  let page: Page | null = null;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        page = await createPage();
        if (expired) { await closePage(page); throw new Error('Export timed out'); }
        return work(page);
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('Export timed out')); }, BROWSER_CONFIG.pageTimeout); }),
    ]);
  } finally {
    clearTimeout(timer);
    await closePage(page);
  }
}
const cleanupTimer = setInterval(() => { void cleanupBrowser().catch(() => undefined); }, 60000);
cleanupTimer.unref();
