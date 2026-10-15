import { startTransition, useRef, useState } from 'react';

import type { AppLanguage } from '../config/ui';
import type { AppSettings } from '../config/settings';
import { extractTextFromFile } from '../utils/fileExtractor';
import { aiFormatResume } from '../utils/aiFormatter';
import { autoFormatResume } from '../utils/resumeParser';

type ImportStep = 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';
type ImportNotice = '' | 'missing-api-key' | 'missing-model' | 'ai-format-fallback';

interface UseResumeImportOptions {
  projectId?: string;
  lang: AppLanguage;
  settings: AppSettings;
  onImportComplete: (markdown: string) => void;
}

export function useResumeImport({ lang, settings, onImportComplete, projectId }: UseResumeImportOptions) {
  const activeProject = useRef(projectId);
  activeProject.current = projectId;
  const busy = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [importError, setImportError] = useState('');
  const [importNotice, setImportNotice] = useState<ImportNotice>('');
  const [importNoticeDetail, setImportNoticeDetail] = useState('');

  const triggerImport = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || busy.current) {
      return;
    }

    try {
      busy.current = true;
      const targetProject = projectId;
      const apply = (formatted: string) => {
        if (!formatted.trim()) throw new Error(lang === 'zh' ? '未提取到有效内容，原简历已保留。' : 'No content was extracted. Your resume was preserved.');
        if (activeProject.current !== targetProject) throw new Error(lang === 'zh' ? '导入期间切换了简历，请在目标简历中重新导入。' : 'The project changed during import. Import again in the intended project.');
        startTransition(() => onImportComplete(formatted));
      };
      setIsImporting(true);
      setImportError('');
      setImportNotice('');
      setImportNoticeDetail('');
      setImportStep('extracting');

      const rawText = await extractTextFromFile(file);
      if (!rawText.trim()) throw new Error(lang === 'zh' ? '未提取到文字，请使用文本 PDF 或先进行 OCR。原简历已保留。' : 'No text found. Use a text PDF or run OCR first. Your resume was preserved.');
      if (/\.md$/i.test(file.name)) { apply(rawText); setImportStep('done'); return; }

      const provider = settings.providers[settings.activeProvider];

      if (!provider.apiKey) {
        setImportStep('parsing');
        const formatted = autoFormatResume(rawText, lang);
        setImportStep('done');
        setImportNotice('missing-api-key');
        apply(formatted);
        return;
      }

      setImportStep('formatting');
      try {
        const formatted = await aiFormatResume(rawText, lang, settings);
        setImportStep('done');
        setImportNotice('');
        apply(formatted);
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

        apply(formatted);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setImportError(errorMessage);
      setImportStep('idle');
    } finally {
      busy.current = false;
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
