import { memo, useMemo, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ListRestart, Undo, Redo, BookOpen, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

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
  const [blocksVisited, setBlocksVisited] = useState(editorMode === 'blocks');
  if (editorMode === 'blocks' && !blocksVisited) setBlocksVisited(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const guideTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileToolsRef = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);
  const compositionGroup = useRef(0);
  const beforeSelection = useRef<EditorSelection | undefined>(undefined);
  const guideLabel = lang === 'zh' ? 'Markdown 帮助' : 'Markdown help';
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
      <div data-testid="editor-toolbar" className="relative flex min-h-16 items-center justify-between gap-1 px-3 py-2 sm:flex-wrap sm:gap-2 sm:px-5 sm:py-2.5">
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
        <div data-mode={editorMode} className="ui-editor-modes relative isolate inline-grid max-w-[calc(100vw-1rem)] grid-cols-2 gap-0.5 rounded-[var(--ui-radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
          <span aria-hidden="true" className="ui-segment-indicator ui-editor-mode-indicator pointer-events-none col-start-1 row-start-1 rounded-[var(--ui-radius-control)] bg-[var(--ui-selected-bg)]" />
          <button
            type="button"
            onClick={() => onEditorModeChange('markdown')}
            aria-pressed={editorMode === 'markdown'}
            className={`ui-segment-button relative col-start-1 row-start-1 min-h-10 shrink-0 whitespace-nowrap rounded-[var(--ui-radius-control)] px-2 py-2 text-xs font-semibold transition-colors duration-200 sm:min-h-8 sm:px-4 z-10 ${
              editorMode === 'markdown'
                ? 'text-[var(--ui-selected-ink)]'
                : 'app-control'
            }`}
          >
            <span className="relative z-10">{t.markdownMode}</span>
          </button>
          <button
            type="button"
            onClick={() => onEditorModeChange('blocks')}
            aria-pressed={editorMode === 'blocks'}
            className={`ui-segment-button relative col-start-2 row-start-1 min-h-10 shrink-0 whitespace-nowrap rounded-[var(--ui-radius-control)] px-2 py-2 text-xs font-semibold transition-colors duration-200 sm:min-h-8 sm:px-4 z-10 ${
              editorMode === 'blocks'
                ? 'text-[var(--ui-selected-ink)]'
                : 'app-control'
            }`}
          >
            <span className="relative z-10">{t.blockMode}</span>
          </button>
        </div>
      </div>

        <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:rounded-[var(--ui-radius-panel)] sm:border sm:border-[var(--app-border)] sm:bg-[var(--app-surface)] sm:p-0.5">
          <button type="button" ref={guideTriggerRef} onClick={() => setGuideOpen(open => !open)}
            title={guideLabel} aria-label={guideLabel} aria-expanded={guideOpen} aria-haspopup="dialog"
            className="app-control hidden min-h-10 min-w-10 items-center justify-center gap-1.5 sm:inline-flex rounded-[var(--ui-radius-control)] px-2 text-xs sm:min-h-8 sm:min-w-8 lg:w-auto lg:px-2.5">
            <BookOpen size={16} aria-hidden="true" /><span className="hidden xl:inline">{lang === 'zh' ? 'Markdown 帮助' : 'Markdown help'}</span>
          </button>
          <span aria-hidden="true" className="mx-0.5 hidden h-4 w-px shrink-0 bg-[var(--app-border)] sm:block" />
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`app-control inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--ui-radius-control)] p-2 transition-colors sm:min-h-8 sm:min-w-8 ${
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
            className={`app-control inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--ui-radius-control)] p-2 transition-colors sm:min-h-8 sm:min-w-8 ${
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
            className="app-control hidden min-h-10 min-w-10 items-center justify-center rounded-[var(--ui-radius-control)] p-2 transition-colors sm:inline-flex sm:min-h-8 sm:min-w-8"
            title={t.formatMarkdown}
            aria-label={t.formatMarkdown}
          >
            <ListRestart size={16} />
          </button>
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger ref={mobileToolsRef} aria-label={lang === 'zh' ? '编辑工具' : 'Editor tools'} className="app-control inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--ui-radius-control)]">
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGuideOpen(true)} closeOnClick><BookOpen size={16} />{guideLabel}</DropdownMenuItem>
                {editorMode === 'markdown' && <DropdownMenuItem onClick={onFormatMarkdown}><ListRestart size={16} />{t.formatMarkdown}</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="row-start-2 min-h-0 overflow-hidden"
      >
        <div hidden={editorMode !== 'markdown'} className="h-full min-h-0">
          <textarea
            data-code-editor
            aria-label={lang === 'zh' ? '简历 Markdown' : 'Resume Markdown'}
            className="block h-full min-h-0 w-full resize-none overflow-y-auto bg-transparent px-4 pbs-3 pbe-6 font-mono text-[13px] leading-[1.75] text-zinc-800 selection:bg-zinc-200 dark:text-zinc-200 dark:selection:bg-zinc-700 sm:px-6 sm:pbe-4 custom-scrollbar"
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
        </div>
        <div hidden={editorMode !== 'blocks'} className="h-full overflow-y-auto overflow-x-hidden pbe-6 sm:pbe-4 custom-scrollbar">
          {blocksVisited && <BlockEditor draft={draft} lang={lang} translations={t} onChange={onDraftChange} />}
        </div>
      </div>
    </div>
    {guideOpen && <MarkdownGuide lang={lang} triggerRef={typeof window !== 'undefined' && window.innerWidth < 640 ? mobileToolsRef : guideTriggerRef} onClose={() => setGuideOpen(false)}
      onUseBlocks={() => { setGuideOpen(false); onEditorModeChange('blocks'); }} />}
    </>
  );
});
