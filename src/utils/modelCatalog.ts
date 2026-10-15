import { DEFAULT_SETTINGS, type ApiProvider } from '@/config/settings';
import { fetchJsonWithTimeout } from './fetchWithTimeout';

export type CatalogProvider = Pick<ApiProvider, 'id' | 'baseUrl' | 'apiKey'>;
export type ModelCatalog = { models: string[]; updatedAt: number; source?: 'public' | 'account' };
export type CatalogErrorCode = 'auth' | 'unsupported' | 'empty' | 'network';
export class CatalogError extends Error {
  constructor(public code: CatalogErrorCode) { super(code); }
}
const memory = new Map<string, ModelCatalog>();
const cachePrefix = 'myresume-model-catalog-v1:';

export function modelListUrl(provider: CatalogProvider) {
  let base = (provider.baseUrl?.trim() || DEFAULT_SETTINGS.providers[provider.id].baseUrl!).replace(/\/+$/, '');
  base = base.replace(/\/(chat\/completions|messages|models)$/, '');
  let url: URL;
  try { url = new URL(base); } catch { throw new CatalogError('unsupported'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new CatalogError('unsupported');
  if (provider.id !== 'gemini' && !/\/v\d+(?:\/|$)/.test(url.pathname)) url.pathname = `${url.pathname.replace(/\/$/, '')}/v1`;
  url.pathname = `${url.pathname.replace(/\/$/, '')}/models`;
  if (provider.id === 'openrouter' && (url.hostname === 'openrouter.ai' || url.hostname.endsWith('.openrouter.ai'))) url.pathname += '/user';
  return url;
}

// Never persist a key or endpoint in the catalog cache. The hash also separates
// accounts at the same gateway. In insecure contexts caching remains in memory.
const sessionKeys = new Map<string, string>();
export async function modelCacheKey(provider: CatalogProvider) {
  const identity = JSON.stringify([provider.id, provider.apiKey.trim() ? modelListUrl(provider).href : 'public-catalog-v1', provider.apiKey.trim()]);
  if (!globalThis.crypto?.subtle) {
    if (!sessionKeys.has(identity)) sessionKeys.set(identity, `session-${sessionKeys.size}`);
    return sessionKeys.get(identity)!;
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return cachePrefix + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function readModelCache(key: string): ModelCatalog | undefined {
  const cached = memory.get(key);
  if (cached) return cached;
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (raw && Array.isArray(raw.models) && raw.models.length > 0 && raw.models.length <= 10000
      && raw.models.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 256)
      && typeof raw.updatedAt === 'number' && raw.updatedAt > 0 && raw.updatedAt <= Date.now()) {
      memory.set(key, raw); return raw;
    }
  } catch { /* Corrupt or blocked storage must not prevent discovery. */ }
}
export function writeModelCache(key: string, catalog: ModelCatalog) {
  memory.set(key, catalog);
  if (key.startsWith(cachePrefix)) {
    try { localStorage.setItem(key, JSON.stringify(catalog)); } catch { /* Memory cache remains usable. */ }
  }
}

type ModelInfo = { id?: unknown; name?: unknown; lifecycle?: unknown; supportedGenerationMethods?: unknown; architecture?: { output_modalities?: unknown } };
export async function fetchModelCatalog(provider: CatalogProvider, signal?: AbortSignal, force = false): Promise<ModelCatalog> {
  if (!provider.apiKey.trim()) {
    try {
      const response = await fetchJsonWithTimeout(`/api/models/catalog?provider=${provider.id}${force ? '&refresh=1' : ''}`, { signal, cache: 'no-store' }, 30000);
      if (!response.ok) throw new CatalogError('network');
      const payload = await response.json();
      if (!Array.isArray(payload.models) || !payload.models.length || payload.models.length > 10000 || !payload.models.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 256 && id !== '__custom_model__') || typeof payload.updatedAt !== 'number' || !Number.isFinite(payload.updatedAt)) throw new CatalogError('unsupported');
      return { models: [...new Set<string>(payload.models)], updatedAt: payload.updatedAt, source: 'public' };
    } catch (error) { throw error instanceof CatalogError ? error : new CatalogError('network'); }
  }
  const endpoint = modelListUrl(provider);
  const headers: Record<string, string> = provider.id === 'anthropic'
    ? { 'x-api-key': provider.apiKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    : provider.id === 'gemini' ? { 'x-goog-api-key': provider.apiKey.trim() }
      : { Authorization: `Bearer ${provider.apiKey.trim()}` };
  if (provider.id === 'gemini') endpoint.searchParams.set('pageSize', '1000');
  if (provider.id === 'anthropic') endpoint.searchParams.set('limit', '1000');
  const offsetPagination = provider.id === 'openrouter' && endpoint.pathname.endsWith('/models/user');
  if (offsetPagination) endpoint.searchParams.set('limit', '1000');
  const models = new Set<string>();
  const seen = new Set<string>();
  const deadline = Date.now() + 30000;
  for (let page = 0; page < 100; page++) {
    let payload;
    try {
      if (Date.now() >= deadline) throw new CatalogError('network');
      const response = await fetchJsonWithTimeout(endpoint.href, { headers, signal, cache: 'no-store', redirect: 'error' }, Math.min(15000, deadline - Date.now()));
      if (!response.ok) throw new CatalogError([401, 403].includes(response.status) ? 'auth' : [404, 405, 501].includes(response.status) ? 'unsupported' : 'network');
      payload = await response.json();
    } catch (error) { throw error instanceof CatalogError ? error : new CatalogError('network'); }
    const entries: unknown = provider.id === 'gemini' ? payload?.models : payload?.data;
    if (!Array.isArray(entries)) throw new CatalogError('unsupported');
    for (const entry of entries as ModelInfo[]) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.lifecycle === 'retired') continue;
      const id = provider.id === 'gemini' ? entry.name : entry.id;
      if (typeof id !== 'string' || !id.trim() || id.length > 256) continue;
      if (provider.id === 'gemini' && (!Array.isArray(entry.supportedGenerationMethods) || !entry.supportedGenerationMethods.includes('generateContent'))) continue;
      const outputs = entry.architecture?.output_modalities;
      if (Array.isArray(outputs) && !outputs.includes('text')) continue;
      // OpenAI-compatible catalogs often mix chat with dedicated non-chat APIs.
      if (/^(text-embedding|embedding|whisper|tts-|dall-e|gpt-image|sora-|omni-moderation|text-moderation)/i.test(id.split('/').at(-1)!)) continue;
      const normalized = provider.id === 'gemini' ? id.replace(/^models\//, '') : id;
      if (normalized !== '__custom_model__') models.add(normalized);
    }
    if (models.size > 10000) throw new CatalogError('unsupported');
    if (offsetPagination && entries.length === 1000) {
      endpoint.searchParams.set('offset', String((page + 1) * 1000));
      continue;
    }
    if (provider.id === 'anthropic' && payload.has_more && (typeof payload.last_id !== 'string' || !payload.last_id)) throw new CatalogError('unsupported');
    const next: unknown = provider.id === 'gemini' ? payload.nextPageToken : provider.id === 'anthropic' && payload.has_more ? payload.last_id : undefined;
    if (!next) {
      if (!models.size) throw new CatalogError('empty');
      return { models: [...models].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })), updatedAt: Date.now(), source: 'account' };
    }
    if (typeof next !== 'string' || seen.has(next)) throw new CatalogError('unsupported');
    seen.add(next);
    endpoint.searchParams.set(provider.id === 'gemini' ? 'pageToken' : 'after_id', next);
  }
  throw new CatalogError('unsupported');
}
