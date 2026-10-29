import { describe, expect, it } from 'vitest';

import { resolveImportNoticeMessage } from '@/utils/importNotice';
import { translations } from '@/config/ui';

describe('resolveImportNoticeMessage', () => {
  it('shows the extraction failure reason so the user can recover', () => {
    expect(resolveImportNoticeMessage({ importError: 'No text found', importNotice: '', importNoticeDetail: '', translations: translations.en })).toContain('No text found');
  });
  it('returns the translated fallback detail when AI formatting fails without extra detail', () => {
    expect(
      resolveImportNoticeMessage({
        importError: '',
        importNotice: 'ai-format-fallback',
        importNoticeDetail: '',
        translations: translations.en,
      }),
    ).toBe('Import complete using local parsing. AI formatting failed.');
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
      'Import complete using local parsing. AI formatting failed. Model "demo" not found',
    );
  });
});
