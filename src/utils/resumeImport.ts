import type { AppLanguage } from '../config/ui';
import type { AppSettings } from '../config/settings';
import { extractTextFromFile } from './fileExtractor';
import { aiFormatResume } from './aiFormatter';

interface PrepareImportedResumeOptions {
  settings: AppSettings;
  extractText?: typeof extractTextFromFile;
}

interface PrepareImportedResumeResult {
  markdown: string;
  notice: '' | 'missing-api-key';
}

export async function prepareImportedResume(
  file: File,
  lang: AppLanguage,
  options: PrepareImportedResumeOptions,
): Promise<PrepareImportedResumeResult> {
  const extractText = options.extractText ?? extractTextFromFile;
  const { settings } = options;
  const rawText = await extractText(file);
  try {
    const formatted = await aiFormatResume(rawText, lang, settings);
    return {
      markdown: formatted,
      notice: '',
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'missing-api-key') {
      return {
        markdown: rawText,
        notice: 'missing-api-key',
      };
    }
    throw error;
  }
}
