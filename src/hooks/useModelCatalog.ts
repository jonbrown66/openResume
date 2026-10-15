import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS } from '@/config/settings';
import { fetchJsonWithTimeout } from '@/utils/fetchWithTimeout';
import { CatalogError, fetchModelCatalog, modelCacheKey, readModelCache, writeModelCache, type CatalogErrorCode, type CatalogProvider, type ModelCatalog } from '@/utils/modelCatalog';

type State = Partial<ModelCatalog> & { loading?: boolean; error?: CatalogErrorCode };
const empty: State = {};
const states = new Map<string, State>();
const requests = new Map<string, AbortController>();
const revisions = new Map<string, number>();
const listeners = new Set<() => void>();
const identityOf = ({ id, baseUrl, apiKey }: CatalogProvider) => JSON.stringify([id, apiKey.trim() ? baseUrl?.trim() : '', apiKey.trim()]);
const publicProvider = (provider: CatalogProvider): CatalogProvider => ({ id: provider.id, apiKey: '' });
const stateOf = (provider: CatalogProvider) => states.get(identityOf(provider)) ?? states.get(identityOf(publicProvider(provider))) ?? empty;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(identity: string, state: State) {
  states.set(identity, state); listeners.forEach(listener => listener());
}
async function hydrate(provider: CatalogProvider) {
  const identity = identityOf(provider);
  if (states.has(identity)) return;
  try {
    const cached = readModelCache(await modelCacheKey(provider));
    if (cached && !states.has(identity)) publish(identity, cached);
  } catch { /* An invalid endpoint must not prevent manual editing. */ }
}
async function refresh(provider: CatalogProvider) {
  const identity = identityOf(provider);
  revisions.set(identity, (revisions.get(identity) ?? 0) + 1);
  requests.get(identity)?.abort();
  const controller = new AbortController(); requests.set(identity, controller);
  const active = () => requests.get(identity) === controller && !controller.signal.aborted;
  publish(identity, { ...stateOf(provider), loading: true, error: undefined });
  try {
    const key = await modelCacheKey(provider);
    if (!active()) return;
    const cached = readModelCache(key);
    publish(identity, { ...cached, ...states.get(identity), loading: true });
    const result = await fetchModelCatalog(provider, controller.signal, true);
    if (!active()) return;
    writeModelCache(key, result); publish(identity, result);
  } catch (error) {
    if (active()) publish(identity, { ...states.get(identity), loading: false, error: error instanceof CatalogError ? error.code : 'network' });
  } finally { if (active()) requests.delete(identity); }
}

let initialRefreshStarted = false;
/** One public batch request per page load, independent of settings-panel mounts. */
export function startInitialModelRefresh() {
  if (initialRefreshStarted) return;
  initialRefreshStarted = true;
  const initialRevisions = new Map(revisions);
  void (async () => {
    const providers = Object.values(DEFAULT_SETTINGS.providers).map(publicProvider);
    await Promise.all(providers.map(hydrate));
    try {
      const response = await fetchJsonWithTimeout('/api/models/catalog?provider=all&refresh=1', { cache: 'no-store' }, 30000);
      if (!response.ok) return;
      const payload = await response.json();
      await Promise.all(providers.map(async provider => {
        const result = payload?.catalogs?.[provider.id];
        if (!result || !Array.isArray(result.models) || !result.models.length || result.models.length > 10000
          || !result.models.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 256 && id !== '__custom_model__')
          || typeof result.updatedAt !== 'number' || !Number.isFinite(result.updatedAt)) return;
        const identity = identityOf(provider);
        // A manual refresh started after entry takes precedence over the batch.
        if (revisions.get(identity) !== initialRevisions.get(identity)) return;
        const catalog: ModelCatalog = { models: [...new Set<string>(result.models)], updatedAt: result.updatedAt, source: 'public' };
        const key = await modelCacheKey(provider);
        if (revisions.get(identity) !== initialRevisions.get(identity)) return;
        writeModelCache(key, catalog); publish(identity, catalog);
      }));
    } catch { /* Keep cached catalogs when the public source is unavailable. */ }
  })();
}
export function useModelCatalog(provider: CatalogProvider) {
  const { id, baseUrl, apiKey } = provider;
  const state = useSyncExternalStore(subscribe, () => stateOf(provider), () => empty);
  // Opening settings or changing credentials only reads existing cache. No HTTP.
  useEffect(() => { void hydrate({ id, baseUrl, apiKey }); }, [id, baseUrl, apiKey]);
  const manualRefresh = useCallback(() => refresh({ id, baseUrl, apiKey }), [id, baseUrl, apiKey]);
  return { ...state, refresh: manualRefresh };
}
