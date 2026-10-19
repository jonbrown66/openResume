import type { ChangeEvent, RefObject } from 'react';
import { Loader2, Upload } from 'lucide-react';
import type { TranslationSet } from '@/config/ui';

type ImportStep = 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';
interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportClick: () => void;
  isImporting: boolean;
  importStep: ImportStep;
  translations: TranslationSet;
}

export function ImportResumeButton({ fileInputRef, onFileChange, onImportClick, isImporting, importStep, translations: t }: Props) {
  const progress = { extracting: t.extracting, parsing: t.parsing, formatting: t.aiFormatting };
  const label = isImporting ? (importStep in progress ? progress[importStep as keyof typeof progress] : t.importing) : t.import;
  return <>
    <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".txt,.md,.pdf,.docx" className="hidden" />
    <button type="button" onClick={onImportClick} disabled={isImporting} aria-label={t.import}
      className="app-secondary flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border p-2 disabled:cursor-not-allowed lg:min-h-0 lg:px-4 lg:py-2">
      {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
      <span className="hidden lg:inline">{label}</span>
    </button>
  </>;
}
