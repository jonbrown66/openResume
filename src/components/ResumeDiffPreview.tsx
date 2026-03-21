import type { TranslationSet } from '@/config/ui';
import type { ResumeDiffLine, ResumeDiffResult } from '@/utils/resumeDiff';

interface ResumeDiffPreviewProps {
  diff: ResumeDiffResult;
  translations: TranslationSet;
}

function getLineClasses(line: ResumeDiffLine) {
  if (line.type === 'added') {
    return 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200';
  }

  if (line.type === 'removed') {
    return 'bg-rose-100/90 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200';
  }

  return 'text-zinc-500 dark:text-zinc-400';
}

function renderLines(lines: ResumeDiffLine[]) {
  return lines.map((line, index) => (
    <div
      key={`${line.type}-${index}-${line.text}`}
      className={`rounded-md px-2 py-1 whitespace-pre-wrap break-words ${getLineClasses(line)}`}
    >
      {line.text || ' '}
    </div>
  ));
}

export function ResumeDiffPreview({ diff, translations: t }: ResumeDiffPreviewProps) {
  return (
    <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
        {t.assistantDiffTitle}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.assistantBefore}</div>
          <div className="space-y-1 text-xs leading-6">{renderLines(diff.before)}</div>
        </section>
        <section className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-3 dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.assistantAfter}</div>
          <div className="space-y-1 text-xs leading-6">{renderLines(diff.after)}</div>
        </section>
      </div>
    </div>
  );
}
