import type { ResumeDraft } from '@/types/resume';
import { DEFAULT_THEME_CONFIG, type ResumeThemeConfig } from '@/types/theme';

export function isResumeDraft(value: unknown): value is ResumeDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as ResumeDraft;
  return Boolean(draft.frontmatter) && ['name', 'title', 'contact'].every(key =>
    typeof draft.frontmatter[key as 'name' | 'title' | 'contact'] === 'string') &&
    (draft.frontmatter.image === undefined || typeof draft.frontmatter.image === 'string') &&
    typeof draft.summary === 'string' &&
    (draft.summaryTitle === undefined || typeof draft.summaryTitle === 'string') &&
    Array.isArray(draft.sections) && draft.sections.every(section => section &&
      typeof section.title === 'string' && typeof section.content === 'string' &&
      Array.isArray(section.entries) && section.entries.every(entry => entry &&
        ['heading', 'meta', 'organization', 'content'].every(key => typeof entry[key as 'heading'] === 'string')));
}

export function hasResumeContent(markdown: string): boolean {
  return Boolean(markdown.trim() && markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, '').trim());
}

export function normalizeTheme(value: unknown): ResumeThemeConfig {
  const raw = value && typeof value === 'object' ? value as Partial<ResumeThemeConfig> : {};
  const number = (key: 'fontSize' | 'lineHeight' | 'sectionSpacing' | 'pageMargin', min: number, max: number) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key])
      ? Math.max(min, Math.min(max, raw[key]!)) : DEFAULT_THEME_CONFIG[key];
  return {
    primaryColor: /^#[\da-f]{6}$/i.test(raw.primaryColor ?? '') ? raw.primaryColor! : DEFAULT_THEME_CONFIG.primaryColor,
    secondaryColor: /^#[\da-f]{6}$/i.test(raw.secondaryColor ?? '') ? raw.secondaryColor! : DEFAULT_THEME_CONFIG.secondaryColor,
    backgroundColor: /^#[\da-f]{6}$/i.test(raw.backgroundColor ?? '') ? raw.backgroundColor! : DEFAULT_THEME_CONFIG.backgroundColor,
    fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : DEFAULT_THEME_CONFIG.fontFamily,
    fontSize: number('fontSize', 6, 24), lineHeight: number('lineHeight', 1, 3),
    sectionSpacing: number('sectionSpacing', 0, 64), pageMargin: number('pageMargin', 5, 40),
    customCss: typeof raw.customCss === 'string' ? raw.customCss : '',
  };
}

export function withDraftIds(draft: ResumeDraft): ResumeDraft {
  return { ...draft, sections: draft.sections.map(section => ({ ...section,
    id: section.id ?? crypto.randomUUID(),
    entries: section.entries.map(entry => ({ ...entry, id: entry.id ?? crypto.randomUUID() })),
  })) };
}
