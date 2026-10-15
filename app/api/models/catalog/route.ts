import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SETTINGS, type ApiProviderId } from '@/config/settings';
import { publicModels } from '@/lib/publicModelCatalog';
import { fetchJsonWithTimeout } from '@/utils/fetchWithTimeout';

export const dynamic = 'force-dynamic';
const providers = Object.keys(DEFAULT_SETTINGS.providers) as ApiProviderId[];
let snapshot: { data: unknown; updatedAt: number } | undefined;
let pending: Promise<{ data: unknown; updatedAt: number }> | undefined;
async function catalog(force: boolean) {
  if (!force && snapshot && Date.now() - snapshot.updatedAt < 60000) return snapshot;
  if (!pending) pending = (async () => {
    // Fixed public source: never forward user endpoints, credentials or resume data.
    const response = await fetchJsonWithTimeout('https://models.dev/api.json', { cache: 'no-store', redirect: 'error' }, 25000);
    if (!response.ok) throw new Error('Public catalog unavailable');
    const result = { data: await response.json(), updatedAt: Date.now() };
    snapshot = result;
    return result;
  })().finally(() => { pending = undefined; });
  return pending;
}
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') ?? '';
  if (provider !== 'all' && !providers.includes(provider as ApiProviderId)) return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  try {
    const result = await catalog(request.nextUrl.searchParams.get('refresh') === '1');
    if (provider === 'all') {
      const catalogs = Object.fromEntries(providers.flatMap(id => {
        try { return [[id, { models: publicModels(result.data, id), updatedAt: result.updatedAt, source: 'public' }]]; }
        catch { return []; } // One unavailable provider must not discard the other catalogs.
      }));
      if (!Object.keys(catalogs).length) throw new Error('No public catalogs available');
      return NextResponse.json({ catalogs }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ models: publicModels(result.data, provider as ApiProviderId), updatedAt: result.updatedAt, source: 'public' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Public catalog unavailable. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
