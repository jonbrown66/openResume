import { describe, expect, it } from 'vitest';

import { FONT_OPTIONS, FONT_STYLES } from '@/constants';

describe('font constants', () => {
  it('keeps resume font options focused on common readable Chinese fonts', () => {
    expect(FONT_OPTIONS).toEqual([
      'Geist',
      'Source Han Sans SC',
      'Source Han Serif SC',
      'Noto Sans SC',
      'Noto Serif SC',
      'Noto Sans',
      'Noto Serif',
      'Noto Mono',
    ]);

    expect(FONT_OPTIONS).not.toContain('ZCOOL QingKe HuangYou');
    expect(FONT_OPTIONS).not.toContain('Ma Shan Zheng');
    expect(FONT_OPTIONS).not.toContain('Maoci');
    expect(FONT_OPTIONS).not.toContain('Long Cang');
  });

  it('maps Source Han font labels to practical local and web fallbacks', () => {
    expect(FONT_STYLES['Source Han Sans SC'].family).toContain('Source Han Sans SC');
    expect(FONT_STYLES['Source Han Sans SC'].family).toContain('Noto Sans SC');
    expect(FONT_STYLES['Source Han Serif SC'].family).toContain('Source Han Serif SC');
    expect(FONT_STYLES['Source Han Serif SC'].family).toContain('Noto Serif SC');
  });
});
