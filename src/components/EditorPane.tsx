import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ListRestart, Undo, Redo } from 'lucide-react';

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
  onFormatMarkdown: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
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
  onFormatMarkdown,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
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
        <div className="app-panel relative inline-flex max-w-[calc(100vw-1rem)] rounded-xl border p-1">
          <button
            type="button"
            onClick={() => onEditorModeChange('markdown')}
            className={`relative min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-200 sm:min-h-0 sm:px-4 z-10 ${
              editorMode === 'markdown' 
                ? 'text-[var(--primary-foreground)]' 
                : 'app-control'
            }`}
          >
            {editorMode === 'markdown' && (
              <motion.div
                layoutId="activeEditorTab"
                className="absolute inset-0 rounded-lg bg-[var(--app-accent)] shadow-sm z-[-1]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t.markdownMode}</span>
          </button>
          <button
            type="button"
            onClick={() => onEditorModeChange('blocks')}
            className={`relative min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-200 sm:min-h-0 sm:px-4 z-10 ${
              editorMode === 'blocks' 
                ? 'text-[var(--primary-foreground)]' 
                : 'app-control'
            }`}
          >
            {editorMode === 'blocks' && (
              <motion.div
                layoutId="activeEditorTab"
                className="absolute inset-0 rounded-lg bg-[var(--app-accent)] shadow-sm z-[-1]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{lang === 'zh' ? '区块' : t.blockMode}</span>
          </button>
        </div>
      </div>

      {editorMode === 'markdown' ? (
        <div className="absolute right-3 top-3 z-30 flex gap-1.5 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`app-panel app-control inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border p-2 transition-colors sm:min-h-0 sm:min-w-0 ${
              !canUndo ? 'opacity-35 cursor-not-allowed pointer-events-none' : ''
            }`}
            title={lang === 'zh' ? '撤销' : 'Undo'}
            aria-label={lang === 'zh' ? '撤销' : 'Undo'}
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`app-panel app-control inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border p-2 transition-colors sm:min-h-0 sm:min-w-0 ${
              !canRedo ? 'opacity-35 cursor-not-allowed pointer-events-none' : ''
            }`}
            title={lang === 'zh' ? '重做' : 'Redo'}
            aria-label={lang === 'zh' ? '重做' : 'Redo'}
          >
            <Redo size={16} />
          </button>
          <button
            type="button"
            onClick={onFormatMarkdown}
            className="app-panel app-control inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border p-2 transition-colors sm:min-h-0 sm:min-w-0"
            title={t.formatMarkdown}
            aria-label={t.formatMarkdown}
          >
            <ListRestart size={16} />
          </button>
        </div>
      ) : null}

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
