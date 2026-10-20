import type { ResumeDraft } from '@/types/resume';
import { getResumeSectionType, isResumeSectionType } from './resumeSections';
import { DEFAULT_THEME_CONFIG, type ResumeThemeConfig } from '@/types/theme';

export function isResumeDraft(value: unknown): value is ResumeDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as ResumeDraft;
  return Boolean(draft.frontmatter) && ['name', 'title', 'contact'].every(key =>
    typeof draft.frontmatter[key as 'name' | 'title' | 'contact'] === 'string') &&
    (draft.frontmatter.image === undefined || typeof draft.frontmatter.image === 'string') &&
    (draft.frontmatter.sourceLines === undefined || (Array.isArray(draft.frontmatter.sourceLines) &&
      draft.frontmatter.sourceLines.every(line => typeof line === 'string' && !/[\r\n]/.test(line) && line.trim() !== '---'))) &&
    typeof draft.summary === 'string' &&
    (draft.summaryTitle === undefined || typeof draft.summaryTitle === 'string') &&
    Array.isArray(draft.sections) && draft.sections.every(section => section &&
      typeof section.title === 'string' && typeof section.content === 'string' &&
      (section.type === undefined || isResumeSectionType(section.type)) &&
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
  let changed = false;
  const sections = draft.sections.map(section => {
    const entries = section.entries.map(entry => entry.id ? entry : { ...entry, id: crypto.randomUUID() });
    if (section.id && section.type && entries.every((entry, index) => entry === section.entries[index])) return section;
    changed = true;
    return { ...section, type: getResumeSectionType(section), id: section.id ?? crypto.randomUUID(), entries };
  });
  return changed ? { ...draft, sections } : draft;
}

/** Reuse untouched content after parsing to preserve memoized sections. */
export function reconcileDraft(draft: ResumeDraft, previous: ResumeDraft): ResumeDraft {
  const sections = draft.sections.map((section, index) => {
    const old = previous.sections[index];
    if (!old) return section;
    const entries = section.entries.map((entry, entryIndex) => {
      const oldEntry = old.entries[entryIndex];
      if (!oldEntry) return entry;
      return ['heading', 'meta', 'organization', 'content'].every(key => entry[key as 'heading'] === oldEntry[key as 'heading'])
        ? oldEntry : { ...entry, id: oldEntry.id };
    });
    // A wholesale Markdown replacement must not inherit an unrelated section's
    // form merely because it occupies the same array position. Untagged title
    // edits can retain their type when the body is otherwise unchanged.
    const sameBody = section.content === old.content && entries.length === old.entries.length && entries.every((entry, i) => entry === old.entries[i]);
    const type = section.type ?? (section.title === old.title || sameBody ? getResumeSectionType(old) : getResumeSectionType(section));
    return type === old.type && section.title === old.title && section.content === old.content && entries.length === old.entries.length && entries.every((entry, i) => entry === old.entries[i])
      ? old : { ...section, type, id: old.id, entries };
  });
  const frontmatter = Object.keys({ ...draft.frontmatter, ...previous.frontmatter }).every(key => draft.frontmatter[key as 'name'] === previous.frontmatter[key as 'name'])
    ? previous.frontmatter : draft.frontmatter;
  return withDraftIds({ ...draft, frontmatter, sections });
}
