import { describe, expect, it } from 'vitest';

import { aiFormatResume } from '@/utils/aiFormatter';
import { DEFAULT_SETTINGS, type AppSettings } from '@/config/settings';

describe('aiFormatResume', () => {
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
});
