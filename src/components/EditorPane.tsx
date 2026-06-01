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
    <div className="group/editor relative z-10 grid h-full flex-1 grid-rows-[auto_1fr] border-r-0 border-[var(--app-border)] bg-[var(--app-surface)] transition-colors duration-200 print:hidden lg:border-r">
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
        className="absolute left-1/2 top-3 z-30 -translate-x-1/2 opacity-100 transition-opacity duration-200 print:hidden sm:top-5"
      >
        <div className="app-panel inline-flex max-w-[calc(100vw-1rem)] rounded-xl border p-1">
          <button
            type="button"
            onClick={() => onEditorModeChange('markdown')}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:px-4 ${
              editorMode === 'markdown' 
                ? 'app-active shadow-sm' 
                : 'app-control'
            }`}
          >
            {t.markdownMode}
          </button>
          <button
            type="button"
            onClick={() => onEditorModeChange('blocks')}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:px-4 ${
              editorMode === 'blocks' 
                ? 'app-active shadow-sm' 
                : 'app-control'
            }`}
          >
            {lang === 'zh' ? '区块' : t.blockMode}
          </button>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="row-start-2 overflow-y-auto overflow-x-hidden pt-16 sm:pt-20 lg:pt-24 pb-8 custom-scrollbar"
      >
        {editorMode === 'markdown' ? (
          <textarea
            className="w-full min-h-[calc(100dvh-9rem)] bg-transparent px-4 font-mono text-[13px] leading-[1.75] text-zinc-800 selection:bg-zinc-200 resize-none focus:outline-none dark:text-zinc-200 dark:selection:bg-zinc-700 sm:min-h-[600px] sm:px-8 lg:px-10"
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
