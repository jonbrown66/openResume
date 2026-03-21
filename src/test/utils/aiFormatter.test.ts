import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiFormatResume } from '@/utils/aiFormatter';
import { DEFAULT_SETTINGS, type AppSettings } from '@/config/settings';

describe('aiFormatResume', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty custom model values before sending the request', async () => {
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          apiKey: 'demo-key',
          model: '   ',
        },
      },
    };

    await expect(aiFormatResume('raw resume', 'en', settings)).rejects.toThrow('missing-model');
  });

  it('uses the documented OpenRouter title header when formatting resumes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'formatted markdown',
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await aiFormatResume('raw resume', 'en', {
      ...DEFAULT_SETTINGS,
      activeProvider: 'openrouter',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openrouter: {
          ...DEFAULT_SETTINGS.providers.openrouter,
          apiKey: 'sk-or-v1-demo',
          model: 'minimax/minimax-m2.5:free',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-or-v1-demo',
          'HTTP-Referer': 'http://localhost:3000',
          'X-OpenRouter-Title': 'Resume Studio',
        }),
      }),
    );
  });
});
