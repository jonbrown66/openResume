import { afterEach, describe, expect, it, vi } from 'vitest';

import { testAiProviderConnection } from '@/utils/aiConnection';
import { DEFAULT_SETTINGS } from '@/config/settings';

describe('testAiProviderConnection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the documented OpenRouter headers for connection checks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });

    vi.stubGlobal('fetch', fetchMock);

    await testAiProviderConnection({
      ...DEFAULT_SETTINGS.providers.openrouter,
      apiKey: 'sk-or-v1-demo',
      model: 'minimax/minimax-m2.5:free',
      baseUrl: 'https://openrouter.ai/api/v1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-or-v1-demo',
          'HTTP-Referer': 'http://localhost:3000',
          'X-OpenRouter-Title': 'Resume Studio',
        }),
      }),
    );
  });
});
