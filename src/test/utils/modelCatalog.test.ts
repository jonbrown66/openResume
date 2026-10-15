import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { fetchModelCatalog, modelCacheKey, modelListUrl, readModelCache, writeModelCache } from '@/utils/modelCatalog';

const provider = { id: 'openai' as const, apiKey: 'test-only-secret', baseUrl: 'https://gateway.example/v1' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
describe('model discovery', () => {
  beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => vi.unstubAllGlobals());
  it('uses configured gateway paths, including full completion endpoints', () => {
    expect(modelListUrl({ ...provider, baseUrl: 'https://gateway.example/proxy/v1/chat/completions/' }).href).toBe('https://gateway.example/proxy/v1/models');
    expect(modelListUrl({ ...provider, baseUrl: 'http://localhost:8080' }).href).toBe('http://localhost:8080/v1/models');
    expect(modelListUrl({ ...provider, id: 'deepseek', baseUrl: '' }).href).toBe('https://api.deepseek.com/v1/models');
    expect(modelListUrl({ ...provider, id: 'openrouter', baseUrl: '' }).href).toBe('https://openrouter.ai/api/v1/models/user');
    expect(modelListUrl({ ...provider, id: 'openrouter' }).href).toBe('https://gateway.example/v1/models');
    expect(() => modelListUrl({ ...provider, baseUrl: 'file:///etc/models' })).toThrow();
  });
  it('fetches live models, removes duplicates and excludes dedicated non-chat APIs', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ data: [{ id: 'future-chat-model' }, { id: 'future-chat-model' }, { id: 'text-embedding-3-small' }, { id: 'openai/gpt-image-1' }, { id: '' }, null] }));
    const result = await fetchModelCatalog(provider);
    expect(result.models).toEqual(['future-chat-model']);
    expect(fetch).toHaveBeenCalledWith('https://gateway.example/v1/models', expect.objectContaining({ headers: { Authorization: 'Bearer test-only-secret' }, cache: 'no-store' }));
  });
  it('reads all Gemini pages and retains only generateContent models', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ models: [{ name: 'models/gemini-next', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embed-next', supportedGenerationMethods: ['embedContent'] }], nextPageToken: 'next-page' }))
      .mockResolvedValueOnce(json({ models: [{ name: 'models/gemini-other', supportedGenerationMethods: ['generateContent'] }] }));
    const result = await fetchModelCatalog({ ...provider, id: 'gemini', baseUrl: '' });
    expect(result.models).toEqual(['gemini-next', 'gemini-other']);
    const second = new URL(vi.mocked(fetch).mock.calls[1][0] as string);
    expect(second.searchParams.get('pageToken')).toBe('next-page');
    expect(second.searchParams.has('key')).toBe(false);
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual({ 'x-goog-api-key': 'test-only-secret' });
  });
  it('reads Anthropic cursor pagination with native authentication', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ data: [{ id: 'claude-next-a' }], has_more: true, last_id: 'claude-next-a' }))
      .mockResolvedValueOnce(json({ data: [{ id: 'claude-next-b' }], has_more: false }));
    expect((await fetchModelCatalog({ ...provider, id: 'anthropic', baseUrl: '' })).models).toEqual(['claude-next-a', 'claude-next-b']);
    expect(new URL(vi.mocked(fetch).mock.calls[1][0] as string).searchParams.get('after_id')).toBe('claude-next-a');
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ 'x-api-key': 'test-only-secret', 'anthropic-version': '2023-06-01' });
  });
  it('reads the complete OpenRouter user catalog with offset pagination', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ data: Array.from({ length: 1000 }, (_, id) => ({ id: `chat-${id}` })) }))
      .mockResolvedValueOnce(json({ data: [{ id: 'future-last-model' }] }));
    expect((await fetchModelCatalog({ ...provider, id: 'openrouter', baseUrl: '' })).models).toHaveLength(1001);
    expect(new URL(vi.mocked(fetch).mock.calls[1][0] as string).searchParams.get('offset')).toBe('1000');
  });
  it('rejects auth failures, unsupported payloads and empty lists without exposing upstream errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: { message: 'test-only-secret' } }, 401))
      .mockResolvedValueOnce(json({ unexpected: [] })).mockResolvedValueOnce(json({ data: [] }));
    await expect(fetchModelCatalog(provider)).rejects.toMatchObject({ code: 'auth', message: 'auth' });
    await expect(fetchModelCatalog(provider)).rejects.toMatchObject({ code: 'unsupported' });
    await expect(fetchModelCatalog(provider)).rejects.toMatchObject({ code: 'empty' });
  });
  it('does not accept partial catalogs when pagination repeats or lacks its cursor', async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ data: [{ id: 'claude-next' }], has_more: true, last_id: 'claude-next' }));
    await expect(fetchModelCatalog({ ...provider, id: 'anthropic' })).rejects.toMatchObject({ code: 'unsupported' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('isolates persistent caches by account and endpoint without storing credentials', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const key = await modelCacheKey(provider);
    expect(await modelCacheKey({ ...provider, apiKey: 'another-test-only-key' })).not.toBe(key);
    expect(await modelCacheKey({ ...provider, baseUrl: 'https://other.example/v1' })).not.toBe(key);
    const catalog = { models: ['future-chat-model'], updatedAt: Date.now() };
    writeModelCache(key, catalog);
    expect(readModelCache(key)).toEqual(catalog);
    expect(JSON.stringify({ key, value: localStorage.getItem(key) })).not.toMatch(/test-only-secret|gateway\.example/);
  });
  it('rejects corrupt cache records and works when storage is blocked', () => {
    localStorage.setItem('corrupt-catalog', '{bad-json');
    expect(readModelCache('corrupt-catalog')).toBeUndefined();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const catalog = { models: ['offline-model'], updatedAt: Date.now() };
    writeModelCache('myresume-model-catalog-v1:blocked-test', catalog);
    expect(readModelCache('myresume-model-catalog-v1:blocked-test')).toEqual(catalog);
    vi.restoreAllMocks();
  });
});
