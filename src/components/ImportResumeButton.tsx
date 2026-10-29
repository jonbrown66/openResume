import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Loader2, FileInput } from 'lucide-react';
import { AnchoredPanel } from './ui/AnchoredPanel';
import type { TranslationSet } from '@/config/ui';

type ImportStep = 'idle' | 'extracting' | 'parsing' | 'formatting' | 'done';
interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportClick: () => void;
  isImporting: boolean;
  importStep: ImportStep;
  translations: TranslationSet;
  lang: 'zh' | 'en';
  projectName: string;
  importTarget: 'new' | 'replace';
  onTargetChange: (target: 'new' | 'replace') => void;
}

export function ImportResumeButton({ fileInputRef, onFileChange, onImportClick, isImporting, importStep, translations: t, lang, projectName, importTarget, onTargetChange }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const progress = { extracting: t.extracting, parsing: t.parsing, formatting: t.aiFormatting };
  const label = isImporting ? (importStep in progress ? progress[importStep as keyof typeof progress] : t.importing) : t.import;
  return <>
    <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".txt,.md,.pdf,.docx" className="hidden" />
    <button type="button" ref={triggerRef} onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" disabled={isImporting} aria-label={t.import}
      className="app-secondary flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border p-2 disabled:cursor-not-allowed lg:min-h-0 lg:px-4 lg:py-2">
      {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileInput size={16} />}
      <span className="hidden text-xs sm:inline lg:text-sm">{isImporting ? label : (lang === 'zh' ? '导入' : 'Import')}</span>
    </button>
    <span role="status" className="sr-only">{isImporting ? label : ''}</span>
    {open && <AnchoredPanel title={t.import} closeLabel={lang === 'zh' ? '关闭' : 'Close'} triggerRef={triggerRef} onClose={() => setOpen(false)}>
      <fieldset className="grid min-w-0 gap-3 text-sm">
        <legend className="mb-3">{lang === 'zh' ? '导入目标' : 'Import destination'}</legend>
        <label className="flex items-start gap-2"><input type="radio" name="import-target" checked={importTarget === 'new'} onChange={() => onTargetChange('new')} />{lang === 'zh' ? '导入为新简历（默认）' : 'Import as new resume (default)'}</label>
        <label className="flex min-w-0 items-start gap-2"><input type="radio" name="import-target" checked={importTarget === 'replace'} onChange={() => onTargetChange('replace')} /><span className="break-all">{lang === 'zh' ? `替换当前简历「${projectName}」` : `Replace current resume “${projectName}”`}</span></label>
        <button type="button" className="app-primary rounded-lg px-3 py-2" onClick={() => { onImportClick(); setOpen(false); }}>{lang === 'zh' ? '选择文件' : 'Choose file'}</button>
      </fieldset>
    </AnchoredPanel>}
  </>;
}
