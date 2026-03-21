import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useResumeImport } from '@/hooks/useResumeImport';
import { DEFAULT_SETTINGS, type AppSettings } from '@/config/settings';
import { extractTextFromFile } from '@/utils/fileExtractor';
import { aiFormatResume } from '@/utils/aiFormatter';
import { autoFormatResume } from '@/utils/resumeParser';

vi.mock('@/utils/fileExtractor', () => ({
  extractTextFromFile: vi.fn(),
}));

vi.mock('@/utils/aiFormatter', () => ({
  aiFormatResume: vi.fn(),
}));

vi.mock('@/utils/resumeParser', () => ({
  autoFormatResume: vi.fn(),
}));

function createSettings(overrides?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...overrides?.providers,
    },
  };
}

describe('useResumeImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(extractTextFromFile).mockResolvedValue('raw resume');
    vi.mocked(autoFormatResume).mockReturnValue('parsed markdown');
  });

  it('shows a missing-model notice and falls back to auto parse when model is empty', async () => {
    const onImportComplete = vi.fn();
    const settings = createSettings({
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          model: '',
          apiKey: 'demo-key',
        },
      },
    });

    vi.mocked(aiFormatResume).mockRejectedValue(new Error('missing-model'));

    const { result } = renderHook(() =>
      useResumeImport({
        lang: 'en',
        settings,
        onImportComplete,
      }),
    );

    await act(async () => {
      await result.current.handleFileChange({
        target: {
          files: [new File(['resume'], 'resume.txt', { type: 'text/plain' })],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.importNotice).toBe('missing-model');
    expect(result.current.importNoticeDetail).toBe('');
    expect(onImportComplete).toHaveBeenCalledWith('parsed markdown');
  });

  it('shows a fallback notice with detail when AI formatting fails for the selected model', async () => {
    const onImportComplete = vi.fn();
    const settings = createSettings({
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          model: 'gpt-5-custom-preview',
          apiKey: 'demo-key',
        },
      },
    });

    vi.mocked(aiFormatResume).mockRejectedValue(new Error('Model "gpt-5-custom-preview" not found'));

    const { result } = renderHook(() =>
      useResumeImport({
        lang: 'en',
        settings,
        onImportComplete,
      }),
    );

    await act(async () => {
      await result.current.handleFileChange({
        target: {
          files: [new File(['resume'], 'resume.txt', { type: 'text/plain' })],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.importNotice).toBe('ai-format-fallback');
    expect(result.current.importNoticeDetail).toContain('gpt-5-custom-preview');
    expect(onImportComplete).toHaveBeenCalledWith('parsed markdown');
  });
});
