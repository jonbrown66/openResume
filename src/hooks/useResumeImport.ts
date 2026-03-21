import { startTransition, useRef, useState } from 'react';

import type { AppLanguage } from '../config/ui';
import type { AppSettings } from '../config/settings';
import { extractTextFromFile } from '../utils/fileExtractor';
import { aiFormatResume } from '../utils/aiFormatter';
import { autoFormatResume } from '../utils/resumeParser';

type ImportStep = 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';

interface UseResumeImportOptions {
  lang: AppLanguage;
  settings: AppSettings;
  onImportComplete: (markdown: string) => void;
}

export function useResumeImport({ lang, settings, onImportComplete }: UseResumeImportOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
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
      setImportStep('extracting');

      const rawText = await extractTextFromFile(file);
      
      const provider = settings.providers[settings.activeProvider];
      
      if (!provider.apiKey) {
        setImportStep('parsing');
        const formatted = autoFormatResume(rawText, lang);
        setImportStep('done');
        setImportNotice('');
        startTransition(() => {
          onImportComplete(formatted);
        });
        return;
      }

      setImportStep('formatting');
      try {
        const formatted = await aiFormatResume(rawText, lang, settings);
        setImportStep('done');
        setImportNotice('');
        startTransition(() => {
          onImportComplete(formatted);
        });
      } catch (aiError) {
        console.warn('[AI Format Failed, falling back to auto-parse]', aiError);
        setImportStep('parsing');
        const formatted = autoFormatResume(rawText, lang);
        setImportStep('done');
        setImportNotice('');
        startTransition(() => {
          onImportComplete(formatted);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setImportError(errorMessage);
      setImportStep('idle');
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
    importStep,
    setImportNotice,
    triggerImport,
  };
}
