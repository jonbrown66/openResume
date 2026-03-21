import { describe, expect, it, vi } from 'vitest';
import { prepareImportedResume } from '@/utils/resumeImport';
import { aiFormatResume } from '@/utils/aiFormatter';
import { type AppSettings, DEFAULT_SETTINGS } from '@/config/settings';

// Mock the aiFormatter module
vi.mock('@/utils/aiFormatter', () => ({
  aiFormatResume: vi.fn(),
}));

const mockSettings: AppSettings = {
  ...DEFAULT_SETTINGS,
  activeProvider: 'gemini',
  providers: {
    ...DEFAULT_SETTINGS.providers,
    gemini: {
      ...DEFAULT_SETTINGS.providers.gemini,
      apiKey: 'demo-key',
    },
  },
};

describe('prepareImportedResume', () => {
  it('formats imported text with AI when api key exists', async () => {
    const extractor = vi.fn().mockResolvedValue('raw resume');
    vi.mocked(aiFormatResume).mockResolvedValue('formatted markdown');

    const result = await prepareImportedResume(
      new File(['resume'], 'resume.txt'),
      'zh',
      {
        settings: mockSettings,
        extractText: extractor,
      },
    );

    expect(result.markdown).toBe('formatted markdown');
    expect(result.notice).toBe('');
    expect(extractor).toHaveBeenCalledTimes(1);
    expect(aiFormatResume).toHaveBeenCalledWith('raw resume', 'zh', mockSettings);
  });

  it('falls back to raw text when api key is missing', async () => {
    const extractor = vi.fn().mockResolvedValue('raw resume');
    const settingsWithNoKey: AppSettings = {
      ...mockSettings,
      providers: {
        ...mockSettings.providers,
        gemini: {
          ...mockSettings.providers.gemini,
          apiKey: '',
        },
      },
    };
    // Make the mock throw the specific 'missing-api-key' error
    vi.mocked(aiFormatResume).mockRejectedValue(new Error('missing-api-key'));

    const result = await prepareImportedResume(
      new File(['resume'], 'resume.txt'),
      'en',
      {
        settings: settingsWithNoKey,
        extractText: extractor,
      },
    );

    expect(result.markdown).toBe('raw resume');
    expect(result.notice).toBe('missing-api-key');
    expect(aiFormatResume).toHaveBeenCalledWith('raw resume', 'en', settingsWithNoKey);
  });
});
