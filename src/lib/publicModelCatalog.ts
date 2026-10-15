import type { ApiProviderId } from '@/config/settings';

const publicProviders: Record<ApiProviderId, string> = {
  openai: 'openai', anthropic: 'anthropic', gemini: 'google', deepseek: 'deepseek', openrouter: 'openrouter',
};
export function publicModels(data: unknown, provider: ApiProviderId): string[] {
  if (!data || typeof data !== 'object') throw new Error('Invalid public catalog');
  const entry = (data as Record<string, unknown>)[publicProviders[provider]];
  if (!entry || typeof entry !== 'object' || !('models' in entry) || !entry.models || typeof entry.models !== 'object') throw new Error('Missing provider catalog');
  const models = Object.values(entry.models).filter((model): model is { id: string; release_date?: string } => {
    if (!model || typeof model !== 'object') return false;
    const item = model as Record<string, unknown>;
    const modalities = item.modalities as { output?: unknown } | undefined;
    const limit = item.limit as { output?: unknown } | undefined;
    return typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 256
      && item.id !== '__custom_model__' && item.status !== 'deprecated' && item.status !== 'retired'
      && Array.isArray(modalities?.output) && modalities.output.includes('text')
      && !modalities.output.some(value => ['image', 'audio', 'video'].includes(value)) && limit?.output !== 0;
  });
  models.sort((a, b) => {
    const releaseA = typeof a.release_date === 'string' ? a.release_date : '';
    const releaseB = typeof b.release_date === 'string' ? b.release_date : '';
    return releaseB.localeCompare(releaseA) || a.id.localeCompare(b.id, 'en', { numeric: true });
  });
  const ids = [...new Set(models.map(model => model.id))];
  if (!ids.length || ids.length > 10000) throw new Error('Empty or oversized public catalog');
  return ids;
}
