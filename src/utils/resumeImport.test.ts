import { describe, expect, it, vi } from 'vitest';

import { prepareImportedResume } from './resumeImport';

describe('prepareImportedResume', () => {
  it('formats imported text with AI when api key exists', async () => {
    const extractor = vi.fn().mockResolvedValue('raw resume');
    const formatter = vi.fn().mockResolvedValue('formatted markdown');

    const result = await prepareImportedResume(new File(['resume'], 'resume.txt'), 'zh', {
      apiKey: 'demo-key',
      extractText: extractor,
      formatText: formatter,
    });

    expect(result.markdown).toBe('formatted markdown');
    expect(result.notice).toBe('');
    expect(extractor).toHaveBeenCalledTimes(1);
    expect(formatter).toHaveBeenCalledWith('raw resume', 'zh', 'demo-key');
  });

  it('falls back to raw text when api key is missing', async () => {
    const extractor = vi.fn().mockResolvedValue('raw resume');
    const formatter = vi.fn();

    const result = await prepareImportedResume(new File(['resume'], 'resume.txt'), 'en', {
      apiKey: '',
      extractText: extractor,
      formatText: formatter,
    });

    expect(result.markdown).toBe('raw resume');
    expect(result.notice).toBe('missing-api-key');
    expect(formatter).not.toHaveBeenCalled();
  });
});
