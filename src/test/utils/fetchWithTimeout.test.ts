// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonWithTimeout } from '@/utils/fetchWithTimeout';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('bounded provider requests', () => {
  it('keeps the timeout active after headers arrive', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async (_url, { signal }: RequestInit) => ({
      status: 200, text: () => new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('aborted')))),
    })));
    const assertion = expect(fetchJsonWithTimeout('https://provider.invalid', {}, 50)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(51); await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('buffers valid responses and clears its timer', async () => {
    vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}')));
    const response = await fetchJsonWithTimeout('https://provider.invalid', {});
    expect(await response.json()).toEqual({ ok: true }); expect(vi.getTimerCount()).toBe(0);
  });
});
