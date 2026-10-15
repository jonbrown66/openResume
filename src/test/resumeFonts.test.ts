import { describe, expect, it } from 'vitest';
import { BUILTIN_FONTS, LOCAL_FONTS, exportFontFamilies, fontFamily, fontNativeName, isBuiltinFont, resolveFont } from '@/lib/resumeFonts';

describe('resume font compatibility and export mapping', () => {
  it('maps legacy Source Han choices to the same bundled family used by export', () => {
    expect(resolveFont('Source Han Sans SC')).toBe('Noto Sans SC');
    expect(fontFamily('Source Han Serif SC')).toBe(fontFamily('Noto Serif SC'));
    expect(exportFontFamilies('Source Han Serif SC', '中文')).toEqual(['Noto Serif SC']);
    expect(isBuiltinFont('Source Han Sans SC')).toBe(true);
  });
  it('keeps optional installed fonts separate from portable built-ins', () => {
    expect(BUILTIN_FONTS).toHaveLength(6);
    for (const id of LOCAL_FONTS) expect(isBuiltinFont(id)).toBe(false);
    expect(resolveFont('Source Han Sans Rounded')).toBe('思源黑体 (细圆)');
  });
  it('embeds actual family names and the Chinese fallback, including punctuation', () => {
    expect(exportFontFamilies('Geist', '工程师 Resume')).toEqual(['Geist Variable', 'Noto Sans SC']);
    expect(exportFontFamilies('Noto Mono', 'Resume')).toEqual(['Noto Sans Mono']);
    expect(exportFontFamilies('Noto Serif', '「」')).toEqual(['Noto Serif', 'Noto Serif SC']);
    expect(fontNativeName('Noto Mono')).toBe('Noto Sans Mono');
    expect(fontNativeName('Source Han Serif SC')).toBe('Noto Serif SC');
  });
});
