import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

import type { AppLanguage, EditorMode, TranslationSet } from '@/config/ui';
import type { ResumeDraft } from '@/types/resume';
import { sanitizeMarkdownForDisplay, restoreAvatarFromDisplay } from '@/utils/markdownDisplay';
import { BlockEditor } from './BlockEditor';
import { EditorSkeleton } from './Skeleton';

interface EditorPaneProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
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

export const EditorPane = memo(function EditorPane({
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
  const displayMarkdown = useMemo(() => sanitizeMarkdownForDisplay(markdown), [markdown]);
  
  const handleMarkdownChange = useCallback((value: string) => {
    const restored = restoreAvatarFromDisplay(value, markdown);
    onMarkdownChange(restored);
  }, [markdown, onMarkdownChange]);

  return (
    <div className="group/editor flex-1 h-full grid grid-rows-[auto_1fr] border-r-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 z-10 transition-colors duration-200 print:hidden relative">
      <div className="relative">
        {isImporting ? (
          <motion.div 
            className="absolute inset-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm overflow-y-auto custom-scrollbar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EditorSkeleton />
          </motion.div>
        ) : null}
        <div className="absolute inset-x-0 top-2 z-20 opacity-0 group-hover/editor:opacity-100 transition-opacity duration-200 print:hidden pointer-events-none" />
      </div>

      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/editor:opacity-100 transition-opacity duration-200 print:hidden"
      >
        <div className="inline-flex rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onEditorModeChange('markdown')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              editorMode === 'markdown' 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t.markdownMode}
          </button>
          <button
            type="button"
            onClick={() => onEditorModeChange('blocks')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              editorMode === 'blocks' 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t.blockMode}
          </button>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="row-start-2 overflow-y-auto overflow-x-hidden pt-16 sm:pt-20 pb-8 custom-scrollbar"
      >
        {editorMode === 'markdown' ? (
          <textarea
            className="w-full min-h-[600px] bg-transparent text-zinc-800 dark:text-zinc-200 font-mono text-[13px] resize-none focus:outline-none leading-[1.7] tracking-tight selection:bg-zinc-200 dark:selection:bg-zinc-700 px-4 sm:px-8"
            value={displayMarkdown}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            spellCheck={false}
            placeholder={t.markdownPlaceholder}
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
          />
        ) : (
          <BlockEditor draft={draft} lang={lang} translations={t} onChange={onDraftChange} />
        )}
      </div>
    </div>
  );
});
