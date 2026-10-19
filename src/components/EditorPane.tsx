import { memo, useMemo, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ListRestart, Undo, Redo, BookOpen } from 'lucide-react';

import type { AppLanguage, EditorMode, TranslationSet } from '@/config/ui';
import type { ResumeDraft } from '@/types/resume';
import { sanitizeMarkdownForDisplay, restoreAvatarFromDisplay } from '@/utils/markdownDisplay';
import type { BlockEditorProps } from './BlockEditor';
import { deferredComponent, useIdlePreload } from '@/lib/deferredComponent';
import { EditorSkeleton } from './Skeleton';
import { MarkdownGuide } from './MarkdownGuide';
import { readEditorSelection, type EditContext, type EditorSelection } from '@/utils/editingHistory';

const BlockEditor = deferredComponent<BlockEditorProps>(
  () => import('./BlockEditor').then(module => ({ default: module.BlockEditor })),
  () => <EditorSkeleton />,
);
const editorPreloads = [BlockEditor.preload];

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
  onMarkdownChange: (value: string, context?: EditContext) => void;
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
  const [guideOpen, setGuideOpen] = useState(false);
  const guideTriggerRef = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);
  const compositionGroup = useRef(0);
  const beforeSelection = useRef<EditorSelection | undefined>(undefined);
  const guideLabel = lang === 'zh' ? 'Markdown 写法与样式' : 'Markdown guide';
  useIdlePreload(editorPreloads);

  const handleMarkdownChange = useCallback((value: string) => {
    const restored = restoreAvatarFromDisplay(value, markdown);
    onMarkdownChange(restored, { group: composing.current ? `composition-${compositionGroup.current}` : 'markdown',
      composing: composing.current, beforeSelection: beforeSelection.current });
    beforeSelection.current = undefined;
  }, [markdown, onMarkdownChange]);

  return (
    <><div onKeyDown={event => {
      if (!(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { event.preventDefault(); if (event.shiftKey) onRedo(); else onUndo(); }
      if (key === 'y') { event.preventDefault(); onRedo(); }
    }} className="group/editor relative z-10 grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-clip border-r-0 border-[var(--app-border)] bg-[var(--app-surface)] transition-colors duration-200 print:hidden lg:border-r">
      <div className="relative flex min-h-16 flex-wrap items-center justify-between gap-2 p-3 sm:px-5">
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
      <div className="min-w-0 print:hidden">
        <div className="app-panel ui-toolbar relative inline-flex max-w-[calc(100vw-1rem)] rounded-xl border p-1">
          <button
            type="button"
            onClick={() => onEditorModeChange('markdown')}
            aria-pressed={editorMode === 'markdown'}
            className={`relative min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-200 sm:min-h-0 sm:px-4 z-10 ${
              editorMode === 'markdown'
                ? 'text-[var(--ui-selected-ink)]'
                : 'app-control'
            }`}
          >
            {editorMode === 'markdown' && (
              <motion.div
                layoutId="activeEditorTab"
                className="absolute inset-0 rounded-lg bg-[var(--ui-selected-bg)] z-[-1]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t.markdownMode}</span>
          </button>
          <button
            type="button"
            onClick={() => onEditorModeChange('blocks')}
            aria-pressed={editorMode === 'blocks'}
            className={`relative min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-200 sm:min-h-0 sm:px-4 z-10 ${
              editorMode === 'blocks'
                ? 'text-[var(--ui-selected-ink)]'
                : 'app-control'
            }`}
          >
            {editorMode === 'blocks' && (
              <motion.div
                layoutId="activeEditorTab"
                className="absolute inset-0 rounded-lg bg-[var(--ui-selected-bg)] z-[-1]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{lang === 'zh' ? '区块' : t.blockMode}</span>
          </button>
        </div>
      </div>

        <div className="ms-auto flex items-center gap-1.5">
          <button type="button" ref={guideTriggerRef} onClick={() => setGuideOpen(open => !open)}
            title={guideLabel} aria-label={guideLabel} aria-expanded={guideOpen} aria-haspopup="dialog"
            className="app-panel app-control inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs sm:min-h-0">
            <BookOpen size={16} aria-hidden="true" /><span className="hidden sm:inline">{lang === 'zh' ? '写法' : 'Guide'}</span>
          </button>
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
            hidden={editorMode !== 'markdown'}
            className="app-panel app-control inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border p-2 transition-colors sm:min-h-0 sm:min-w-0"
            title={t.formatMarkdown}
            aria-label={t.formatMarkdown}
          >
            <ListRestart size={16} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`row-start-2 min-h-0 ${editorMode === 'markdown' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden pbe-[calc(6.75rem+env(safe-area-inset-bottom))] sm:pbe-4 custom-scrollbar'}`}
      >
        {editorMode === 'markdown' ? (
          <textarea
            data-code-editor
            aria-label={lang === 'zh' ? '简历 Markdown' : 'Resume Markdown'}
            className="block h-full min-h-0 w-full resize-none overflow-y-auto bg-transparent px-4 pbs-3 pbe-[calc(6.75rem+env(safe-area-inset-bottom))] font-mono text-[13px] leading-[1.75] text-zinc-800 selection:bg-zinc-200 dark:text-zinc-200 dark:selection:bg-zinc-700 sm:px-6 sm:pbe-4 custom-scrollbar"
            value={displayMarkdown}
            onBeforeInput={event => { beforeSelection.current = readEditorSelection(event.currentTarget); }}
            onCompositionStart={event => {
              composing.current = true;
              compositionGroup.current++;
              beforeSelection.current = readEditorSelection(event.currentTarget);
              onMarkdownChange(markdown, { composing: true });
            }}
            onCompositionEnd={event => {
              handleMarkdownChange(event.currentTarget.value);
              composing.current = false;
              handleMarkdownChange(event.currentTarget.value);
            }}
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
    {guideOpen && <MarkdownGuide lang={lang} triggerRef={guideTriggerRef} onClose={() => setGuideOpen(false)}
      onUseBlocks={() => { setGuideOpen(false); onEditorModeChange('blocks'); }} />}
    </>
  );
});
