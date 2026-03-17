import type { RefObject } from 'react';

import { Loader2 } from 'lucide-react';

import type { AppLanguage, EditorMode, TranslationSet } from '../config/ui';
import type { ResumeDraft } from '../types/resume';
import { BlockEditor } from './BlockEditor';

interface EditorPaneProps {
  containerRef: RefObject<HTMLDivElement | null>;
  draft: ResumeDraft;
  editorMode: EditorMode;
  lang: AppLanguage;
  isImporting: boolean;
  markdown: string;
  translations: TranslationSet;
  onDraftChange: (draft: ResumeDraft) => void;
  onEditorModeChange: (mode: EditorMode) => void;
  onMarkdownChange: (value: string) => void;
}

export function EditorPane({
  containerRef,
  draft,
  editorMode,
  lang,
  isImporting,
  markdown,
  translations: t,
  onDraftChange,
  onEditorModeChange,
  onMarkdownChange,
}: EditorPaneProps) {
  return (
    <div className="group/editor flex-1 h-full flex flex-col border-r-0 lg:border-r border-gray-200 dark:border-gray-800 bg-[#fcfbf9] dark:bg-gray-900 z-10 transition-colors duration-300 print:hidden relative">
      {isImporting ? (
        <div className="absolute inset-0 z-30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.importing}</p>
          <p className="text-xs text-gray-500 mt-2">{t.importFormatting}</p>
        </div>
      ) : null}

      {/* Floating editor mode toggle — appears on hover */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/editor:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/editor:translate-y-0 print:hidden">
        <div className="inline-flex rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-1 shadow-2xl">
          <button
            type="button"
            onClick={() => onEditorModeChange('markdown')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              editorMode === 'markdown' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t.markdownMode}
          </button>
          <button
            type="button"
            onClick={() => onEditorModeChange('blocks')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              editorMode === 'blocks' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t.blockMode}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden pt-12 sm:pt-16 pb-8 custom-scrollbar">
        <div className="w-full px-4 sm:px-8">
          {editorMode === 'markdown' ? (
            <textarea
              className="w-full min-h-[600px] bg-transparent text-gray-800 dark:text-gray-200 font-mono text-[13px] resize-none focus:outline-none leading-[1.7] tracking-tight custom-scrollbar selection:bg-indigo-100 dark:selection:bg-indigo-900/30"
              value={markdown}
              onChange={(event) => onMarkdownChange(event.target.value)}
              spellCheck={false}
              placeholder="# Markdown Editor..."
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
            />
          ) : (
            <BlockEditor draft={draft} lang={lang} translations={t} onChange={onDraftChange} />
          )}
        </div>
      </div>
    </div>
  );
}
