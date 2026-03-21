import type { TranslationSet } from '@/config/ui';

type ImportNotice = '' | 'missing-api-key' | 'missing-model' | 'ai-format-fallback';

interface ResolveImportNoticeMessageOptions {
  importError: string;
  importNotice: ImportNotice;
  importNoticeDetail: string;
  translations: TranslationSet;
}

export function resolveImportNoticeMessage({
  importError,
  importNotice,
  importNoticeDetail,
  translations: t,
}: ResolveImportNoticeMessageOptions) {
  if (importError) {
    return t.importFailed;
  }

  if (importNotice === 'missing-api-key') {
    return t.importNoApiKey;
  }

  if (importNotice === 'missing-model') {
    return t.importMissingModel;
  }

  if (importNotice === 'ai-format-fallback') {
    return importNoticeDetail ? `${t.importAiFallback} ${importNoticeDetail}` : t.importAiFallback;
  }

  return '';
}
