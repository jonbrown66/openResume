import { startTransition, useRef, useState } from 'react';

import type { AppLanguage } from '../config/ui';
import type { AppSettings } from '../config/settings';
import { extractTextFromFile } from '../utils/fileExtractor';
import { aiFormatResume } from '../utils/aiFormatter';
import { autoFormatResume } from '../utils/resumeParser';

type ImportStep = 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';
type ImportNotice = '' | 'missing-api-key' | 'missing-model' | 'ai-format-fallback';

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
  const [importNotice, setImportNotice] = useState<ImportNotice>('');
  const [importNoticeDetail, setImportNoticeDetail] = useState('');

  const triggerImport = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      setImportError('');
      setImportNotice('');
      setImportNoticeDetail('');
      setImportStep('extracting');

      const rawText = await extractTextFromFile(file);
      
      const provider = settings.providers[settings.activeProvider];
      
      if (!provider.apiKey) {
        setImportStep('parsing');
        const formatted = autoFormatResume(rawText, lang);
        setImportStep('done');
        setImportNotice('missing-api-key');
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

        const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
        if (errorMessage === 'missing-api-key') {
          setImportNotice('missing-api-key');
          setImportNoticeDetail('');
        } else if (errorMessage === 'missing-model') {
          setImportNotice('missing-model');
          setImportNoticeDetail('');
        } else {
          setImportNotice('ai-format-fallback');
          setImportNoticeDetail(errorMessage.trim());
        }

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
    importNoticeDetail,
    isImporting,
    importStep,
    setImportNotice,
    triggerImport,
  };
}
