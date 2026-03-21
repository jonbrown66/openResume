import { describe, expect, it } from 'vitest';

import { resolveImportNoticeMessage } from '@/utils/importNotice';
import { translations } from '@/config/ui';

describe('resolveImportNoticeMessage', () => {
  it('returns the translated fallback detail when AI formatting fails without extra detail', () => {
    expect(
      resolveImportNoticeMessage({
        importError: '',
        importNotice: 'ai-format-fallback',
        importNoticeDetail: '',
        translations: translations.en,
      }),
    ).toBe('AI formatting failed for the selected model. Imported auto-parsed content instead.');
  });

  it('appends the provider error detail when AI formatting fallback contains extra detail', () => {
    expect(
      resolveImportNoticeMessage({
        importError: '',
        importNotice: 'ai-format-fallback',
        importNoticeDetail: 'Model "demo" not found',
        translations: translations.en,
      }),
    ).toBe(
      'AI formatting failed for the selected model. Imported auto-parsed content instead. Model "demo" not found',
    );
  });
});
