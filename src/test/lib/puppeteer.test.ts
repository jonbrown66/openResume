// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ launch: vi.fn(), newPage: vi.fn() }));
vi.mock('playwright-core', () => ({ chromium: { launch: mock.launch } }));
import { closeBrowser, closePage, createPage, withExportPage, BROWSER_CONFIG } from '@/lib/puppeteer';
beforeEach(() => {
  process.env.CHROME_PATH = 'test-browser';
  mock.launch.mockResolvedValue({ isConnected: () => true, newPage: mock.newPage, on: vi.fn(), close: vi.fn(async () => undefined) });
  mock.newPage.mockImplementation(async () => ({ route: vi.fn(), on: vi.fn(), setDefaultTimeout: vi.fn(), close: vi.fn(async () => undefined) }));
});
afterEach(async () => { await closeBrowser(); vi.clearAllMocks(); vi.useRealTimers(); delete process.env.CHROME_PATH; });
describe('export browser lifecycle', () => {
  it('reserves capacity before asynchronous page creation', async () => {
    const pending = Array.from({ length: BROWSER_CONFIG.maxInstances }, () => createPage());
    await expect(createPage()).rejects.toThrow('Server busy');
    const pages = await Promise.all(pending); await Promise.all(pages.map(closePage));
    const replacement = await createPage(); await closePage(replacement);
  });
  it('recovers from browser launch failure', async () => {
    mock.launch.mockRejectedValueOnce(new Error('launch failed'));
    await expect(createPage()).rejects.toThrow('launch failed');
    const page = await createPage(); await closePage(page); expect(mock.launch).toHaveBeenCalledTimes(2);
  });
  it('clears the timeout after a successful export', async () => {
    vi.useFakeTimers(); expect(await withExportPage(async () => 'pdf')).toBe('pdf');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('closes an unfinished export and releases capacity on timeout', async () => {
    vi.useFakeTimers();
    const assertion = expect(withExportPage(() => new Promise(() => undefined))).rejects.toThrow('Export timed out');
    await vi.advanceTimersByTimeAsync(BROWSER_CONFIG.pageTimeout + 1); await assertion;
    expect(vi.getTimerCount()).toBe(0);
    const replacement = await createPage(); await closePage(replacement);
  });
  it('disables scripts and aborts private network and file requests', async () => {
    const page = await createPage();
    expect(mock.newPage).toHaveBeenCalledWith(expect.objectContaining({ javaScriptEnabled: false }));
    const register = page.route as unknown as ReturnType<typeof vi.fn>;
    const handler = register.mock.calls[0][1];
    for (const url of ['http://127.0.0.1/private', 'http://169.254.169.254/', 'file:///etc/passwd']) {
      const request = { request: () => ({ url: () => url }), abort: vi.fn(async () => undefined), continue: vi.fn(async () => undefined) };
      handler(request); expect(request.abort).toHaveBeenCalled(); expect(request.continue).not.toHaveBeenCalled();
    }
    await closePage(page);
  });
});
