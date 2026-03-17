import { startTransition, useRef, useState } from 'react';

import type { AppLanguage } from '../config/ui';
import type { AppSettings } from '../config/settings';
import { prepareImportedResume } from '../utils/resumeImport';

interface UseResumeImportOptions {
  lang: AppLanguage;
  settings: AppSettings;
  onImportComplete: (markdown: string) => void;
}

export function useResumeImport({ lang, settings, onImportComplete }: UseResumeImportOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importNotice, setImportNotice] = useState<'' | 'missing-api-key'>('');

  const triggerImport = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      setImportError('');
      const result = await prepareImportedResume(file, lang, { settings });
      setImportNotice(result.notice);
      startTransition(() => {
        onImportComplete(result.markdown);
      });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'import-failed');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return {
    fileInputRef,
    handleFileChange,
    importError,
    importNotice,
    isImporting,
    setImportNotice,
    triggerImport,
  };
}
