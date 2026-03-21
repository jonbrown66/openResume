import { enTranslations, type TranslationDefinition } from '@/config/translations/en';
import { zhTranslations } from '@/config/translations/zh';

export type AppLanguage = 'en' | 'zh';
export type AppTheme = 'light' | 'dark' | 'system';
export type ActiveView = 'editor' | 'preview';
export type ResumeTemplate = 'classic' | 'minimal' | 'standard' | 'sidebar';
export type EditorMode = 'markdown' | 'blocks';

export const resumeTemplates: ResumeTemplate[] = [
  'classic',
  'minimal',
  'standard',
  'sidebar',
];

export const translations = {
  en: enTranslations,
  zh: zhTranslations,
} as const satisfies Record<AppLanguage, TranslationDefinition>;

export type TranslationSet = TranslationDefinition;
