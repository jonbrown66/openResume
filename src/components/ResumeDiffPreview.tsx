import type { TranslationSet } from '@/config/ui';
import type { ResumeDiffLine, ResumeDiffResult } from '@/utils/resumeDiff';
import { Fragment, useState } from 'react';

interface ResumeDiffPreviewProps {
  diff: ResumeDiffResult;
  translations: TranslationSet;
  compact?: boolean;
}

const COMPACT_CONTEXT_LINES = 2;

function getLineClasses(line: ResumeDiffLine) {
  if (line.type === 'added') {
    return 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200';
  }

  if (line.type === 'removed') {
    return 'bg-rose-100/90 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200';
  }

  return 'text-zinc-500 dark:text-zinc-400';
}

interface VisibleLine {
  line: ResumeDiffLine;
  index: number;
}

function getChangedContext(lines: ResumeDiffLine[]): VisibleLine[] {
  const visible = new Set<number>();
  lines.forEach((line, index) => {
    if (line.type === 'unchanged') return;
    for (
      let contextIndex = Math.max(0, index - COMPACT_CONTEXT_LINES);
      contextIndex <= Math.min(lines.length - 1, index + COMPACT_CONTEXT_LINES);
      contextIndex += 1
    ) {
      visible.add(contextIndex);
    }
  });

  if (visible.size === 0) {
    return lines.map((line, index) => ({ line, index }));
  }

  return Array.from(visible)
    .sort((left, right) => left - right)
    .map(index => ({ line: lines[index], index }));
}

function renderLines(lines: VisibleLine[], previousIndex: () => number) {
  return lines.map(({ line, index }) => {
    const gap = previousIndex();
    previousIndex = () => index;
    return (
      <Fragment key={`${line.type}-${index}`}>
        {gap >= 0 && index - gap > 1 && (
          <div className="px-2 py-0.5 text-center text-[11px] text-zinc-400">
            ···
          </div>
        )}
        <div className={`rounded-md px-2 py-1 whitespace-pre-wrap break-words ${getLineClasses(line)}`}>
          {line.text || ' '}
        </div>
      </Fragment>
    );
  });
}

export function ResumeDiffPreview({ diff, translations: t, compact = false }: ResumeDiffPreviewProps) {
  const [showFull, setShowFull] = useState(false);
  const before = compact && !showFull
    ? getChangedContext(diff.before)
    : diff.before.map((line, index) => ({ line, index }));
  const after = compact && !showFull
    ? getChangedContext(diff.after)
    : diff.after.map((line, index) => ({ line, index }));
  const zh = t.assistantBefore === '修改前';
  return (
    <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
        {t.assistantDiffTitle}
      </div>
      {compact && <div className="mbe-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>{zh ? '删除' : 'Removed'} {diff.before.filter(line => line.type === 'removed').length} · {zh ? '新增' : 'Added'} {diff.after.filter(line => line.type === 'added').length}</span>
        <button type="button" className="app-control min-h-9 rounded-lg px-2 underline active:opacity-70" aria-expanded={showFull} onClick={() => setShowFull(value => !value)}>{showFull ? (zh ? '只看改动' : 'Changes only') : (zh ? '查看完整对比' : 'Full comparison')}</button>
      </div>}
      <div className={`grid gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        <section className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.assistantBefore}</div>
          <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain text-xs leading-6">{renderLines(before, () => -1)}</div>
        </section>
        <section className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.assistantAfter}</div>
          <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain text-xs leading-6">{renderLines(after, () => -1)}</div>
        </section>
      </div>
    </div>
  );
}
