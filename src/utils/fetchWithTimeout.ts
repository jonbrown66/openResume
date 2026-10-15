/** Read the response body before releasing the timeout, not just the headers. */
export async function fetchJsonWithTimeout(url: string, options: RequestInit, timeout = 60000): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Request timed out or cancelled after ${timeout}ms`);
    throw error;
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
  }
}
