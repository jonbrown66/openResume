import { BUILTIN_FONTS, FONT_STYLES } from '@/constants';
export { BUILTIN_FONTS, LOCAL_FONTS } from '@/constants';

const aliases: Record<string, string> = {
  'Source Han Sans SC': 'Noto Sans SC', 'Source Han Serif SC': 'Noto Serif SC',
  '思源柔黑体': '思源黑体 (细圆)', 'Source Han Sans Rounded': '思源黑体 (细圆)',
};
const localNames: Record<string, string[]> = {
  '思源黑体 (细圆)': ['Gen Jyuu Gothic', '思源柔黑体', 'Resource Han Rounded CN', '源柔黑体'],
  '源泉圓體': ['GenSenRounded', '源泉圓體'],
  '全字庫正宋體': ['TW-Sung', '全字庫正宋體'],
  '全字庫正楷體': ['TW-Kai', '全字庫正楷體'],
  'Fira Mono': ['Fira Mono'],
};
export function resolveFont(id: string) { return aliases[id] ?? id; }
export function isBuiltinFont(id: string) { return (BUILTIN_FONTS as readonly string[]).includes(resolveFont(id)); }
export function fontNativeName(id: string) {
  const resolved = resolveFont(id);
  return resolved === 'Noto Mono' ? 'Noto Sans Mono' : (localNames[resolved]?.[0] ?? resolved);
}
export function fontFamily(id: string) {
  const resolved = resolveFont(id);
  return FONT_STYLES[resolved]?.family ?? FONT_STYLES.Geist.family;
}
export function fontLabel(id: string, lang: 'en' | 'zh') {
  const resolved = resolveFont(id);
  const chinese: Record<string, string> = {
    'Noto Sans SC': '思源黑体 · Noto Sans SC', 'Noto Serif SC': '思源宋体 · Noto Serif SC',
    'Noto Sans': 'Noto Sans · 英文黑体', 'Noto Serif': 'Noto Serif · 英文衬线', 'Noto Mono': 'Noto Sans Mono · 等宽',
  };
  return lang === 'zh' ? chinese[resolved] ?? resolved : resolved === 'Noto Mono' ? 'Noto Sans Mono' : resolved;
}

// CSS is split by family; unicode-range keeps unused CJK subsets off the network.
const styles: Record<string, () => Promise<unknown>> = {
  'Geist': () => Promise.resolve(),
  'Noto Sans SC': () => Promise.all([import('@fontsource/noto-sans-sc/400.css'), import('@fontsource/noto-sans-sc/700.css')]),
  'Noto Serif SC': () => Promise.all([import('@fontsource/noto-serif-sc/400.css'), import('@fontsource/noto-serif-sc/700.css')]),
  'Noto Sans': () => Promise.all([import('@fontsource/noto-sans/400.css'), import('@fontsource/noto-sans/700.css')]),
  'Noto Serif': () => Promise.all([import('@fontsource/noto-serif/400.css'), import('@fontsource/noto-serif/700.css')]),
  'Noto Mono': () => Promise.all([import('@fontsource/noto-sans-mono/400.css'), import('@fontsource/noto-sans-mono/700.css')]),
};
const styleLoads = new Map<string, Promise<unknown>>();
function loadStyles(id: string) {
  let promise = styleLoads.get(id);
  if (!promise) {
    promise = styles[id]().then(async () => {
      // Next can resolve the CSS module before its stylesheet has been applied.
      // Wait for both weights to appear, rather than assuming one animation frame.
      const family = id === 'Geist' ? 'Geist Variable' : fontNativeName(id);
      const deadline = Date.now() + 10000;
      while (![400, 700].every(weight => Array.from(document.fonts).some(face =>
        face.family.replace(/['"]/g, '') === family && (face.weight === String(weight) || face.weight === '100 900')))) {
        if (Date.now() > deadline) throw new Error(`Font stylesheet did not register: ${family}`);
        await new Promise(resolve => setTimeout(resolve, 16));
      }
    }).catch(error => { styleLoads.delete(id); throw error; });
    styleLoads.set(id, promise);
  }
  return promise;
}
const localChecks = new Map<string, Promise<boolean>>();
export function checkLocalFont(id: string): Promise<boolean> {
  const resolved = resolveFont(id);
  if (!localChecks.has(resolved)) localChecks.set(resolved, (async () => {
    for (const name of localNames[resolved] ?? []) {
      try {
        // FontFace(local) rejects missing fonts; fonts.check can accept a fallback.
        await new FontFace('Resume font probe', `local("${name}")`).load();
        return true;
      } catch { /* Try the next installed family name. */ }
    }
    return false;
  })());
  return localChecks.get(resolved)!;
}
export function exportFontFamilies(id: string, text: string): string[] {
  const resolved = resolveFont(id);
  return [resolved === 'Geist' ? 'Geist Variable' : fontNativeName(resolved),
    ...(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff00-\uffef]/u.test(text)
      && resolved !== 'Noto Serif SC' && resolved !== 'Noto Sans SC' ? [fontFamily(resolved).includes('Noto Serif SC') ? 'Noto Serif SC' : 'Noto Sans SC'] : [])];
}
export async function ensureResumeFonts(id: string, text: string) {
  const resolved = resolveFont(id);
  if (!isBuiltinFont(resolved) && !await checkLocalFont(resolved)) throw new Error('Selected local font is not installed. Choose a built-in font.');
  if (isBuiltinFont(resolved)) await loadStyles(resolved);
  const families = exportFontFamilies(resolved, text);
  await Promise.all(families.filter(family => family === 'Noto Sans SC' || family === 'Noto Serif SC').map(loadStyles));
  // A failed CSS FontFace retains its rejected promise. Recreate those declarations
  // on explicit retry so a temporary network failure does not poison the session.
  const failed = new Set(Array.from(document.fonts).filter(face => face.status === 'error' && families.includes(face.family.replace(/['"]/g, ''))).map(face => face.family.replace(/['"]/g, '')));
  if (failed.size) {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        Array.from(sheet.cssRules).forEach((rule, index) => {
          if (rule.type !== 5 || !failed.has((rule as CSSFontFaceRule).style.fontFamily.replace(/['"]/g, ''))) return;
          const css = rule.cssText;
          sheet.deleteRule(index); sheet.insertRule(css, index);
        });
      } catch (error) { if (!(error instanceof DOMException && error.name === 'SecurityError')) throw error; }
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
  const loading = Promise.all(families.flatMap(family => [400, 700].map(async weight => {
    const loaded = await document.fonts.load(`${weight} 14px "${family}"`, `${text} Resume`);
    if (!loaded.length && isBuiltinFont(resolved)) throw new Error(`Font did not load: ${family}`);
  })));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([loading, new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Font loading timed out. Retry or choose another font.')), 15000);
    })]);
  } finally { clearTimeout(timeout); }
}
