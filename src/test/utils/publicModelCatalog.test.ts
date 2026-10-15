import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { publicModels } from '@/lib/publicModelCatalog';
import { fetchModelCatalog, modelCacheKey } from '@/utils/modelCatalog';

const model = (id: string, release_date = '2026-01-01') => ({ id, release_date, modalities: { input: ['text', 'image'], output: ['text'] }, limit: { output: 1000 } });
describe('keyless public model catalogs', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => vi.unstubAllGlobals());
  it('preserves native IDs and sorts by release date without converting canonical aliases', () => {
    expect(publicModels({ anthropic: { models: { a: model('claude-old'), b: { ...model('claude-next-native', '2026-10-01'), canonical_model_id: 'anthropic/other-id' } } } }, 'anthropic'))
      .toEqual(['claude-next-native', 'claude-old']);
    expect(publicModels({ google: { models: { a: model('gemini-next') } } }, 'gemini')).toEqual(['gemini-next']);
  });
  it('excludes retired and media generation entries while allowing vision inputs', () => {
    const models = { a: model('chat-with-vision'), b: { ...model('retired'), status: 'deprecated' },
      c: { ...model('image-model'), modalities: { output: ['image', 'text'] } }, d: { ...model('no-output'), limit: { output: 0 } } };
    expect(publicModels({ openai: { models } }, 'openai')).toEqual(['chat-with-vision']);
    expect(() => publicModels({}, 'openai')).toThrow();
  });
  it('fetches a public list without credentials even when a custom endpoint is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ models: ['public-new'], updatedAt: Date.now() })));
    const provider = { id: 'openai' as const, apiKey: '', baseUrl: 'invalid-custom-url' };
    expect((await fetchModelCatalog(provider, undefined, true)).source).toBe('public');
    expect(fetch).toHaveBeenCalledWith('/api/models/catalog?provider=openai&refresh=1', expect.not.objectContaining({ headers: expect.anything() }));
    await expect(modelCacheKey(provider)).resolves.toEqual(expect.any(String));
  });
  it('rejects malformed or empty public responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ models: [], updatedAt: Date.now() })));
    await expect(fetchModelCatalog({ id: 'openai', apiKey: '' })).rejects.toMatchObject({ code: 'unsupported' });
  });
  it('serves the fixed public source without forwarding user headers and forces refresh', async () => {
    vi.resetModules();
    const { GET } = await import('../../../app/api/models/catalog/route');
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ openai: { models: { a: model('public-chat') } } })));
    const request = () => new NextRequest('http://localhost/api/models/catalog?provider=openai', { headers: { Authorization: 'Bearer test-only-do-not-forward' } });
    expect(await (await GET(request())).json()).toMatchObject({ source: 'public', models: ['public-chat'] });
    await GET(request()); expect(fetch).toHaveBeenCalledTimes(1);
    await GET(new NextRequest('http://localhost/api/models/catalog?provider=openai&refresh=1'));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith('https://models.dev/api.json', expect.not.objectContaining({ headers: expect.anything() }));
  });
  it('rejects unknown providers before fetching and reports public source failures', async () => {
    vi.resetModules();
    const { GET } = await import('../../../app/api/models/catalog/route');
    expect((await GET(new NextRequest('http://localhost/api/models/catalog?provider=__proto__'))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockRejectedValue(new Error('network failed'));
    expect((await GET(new NextRequest('http://localhost/api/models/catalog?provider=openai'))).status).toBe(503);
  });
  it('returns every available provider with one upstream fetch and isolates a missing provider', async () => {
    vi.resetModules();
    const { GET } = await import('../../../app/api/models/catalog/route');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(Object.fromEntries(
      ['openai', 'anthropic', 'google', 'deepseek', 'openrouter'].map(id => [id, { models: { a: model(`${id}-latest`) } }]),
    ))));
    const response = await GET(new NextRequest('http://localhost/api/models/catalog?provider=all&refresh=1'));
    const { catalogs } = await response.json();
    expect(Object.keys(catalogs)).toHaveLength(5);
    expect(catalogs.gemini.models).toEqual(['google-latest']);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ openai: { models: { a: model('openai-latest') } } })));
    const partial = await (await GET(new NextRequest('http://localhost/api/models/catalog?provider=all&refresh=1'))).json();
    expect(Object.keys(partial.catalogs)).toEqual(['openai']);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
