import { sanitizeMarkdownImagesForAi } from '@/utils/aiMarkdownSanitizer';

export type ResumeDiffLineType = 'unchanged' | 'added' | 'removed';

export interface ResumeDiffLine {
  text: string;
  type: ResumeDiffLineType;
}

export interface ResumeDiffResult {
  before: ResumeDiffLine[];
  after: ResumeDiffLine[];
}

const MAX_EXACT_DIFF_LINES = 400;
const MAX_EXACT_DIFF_CELLS = 160_000;

function buildLcsMatrix(before: string[], after: string[]) {
  const matrix = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = before[i] === after[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }
  return matrix;
}

function buildFallbackResumeDiff(beforeLines: string[], afterLines: string[]): ResumeDiffResult {
  let prefix = 0;
  while (prefix < beforeLines.length && prefix < afterLines.length && beforeLines[prefix] === afterLines[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix &&
    suffix < afterLines.length - prefix &&
    beforeLines[beforeLines.length - suffix - 1] === afterLines[afterLines.length - suffix - 1]
  ) {
    suffix += 1;
  }

  return {
    before: [
      ...beforeLines.slice(0, prefix).map((text): ResumeDiffLine => ({ text, type: 'unchanged' })),
      ...beforeLines.slice(prefix, beforeLines.length - suffix).map((text): ResumeDiffLine => ({ text, type: 'removed' })),
      ...beforeLines.slice(beforeLines.length - suffix).map((text): ResumeDiffLine => ({ text, type: 'unchanged' })),
    ],
    after: [
      ...afterLines.slice(0, prefix).map((text): ResumeDiffLine => ({ text, type: 'unchanged' })),
      ...afterLines.slice(prefix, afterLines.length - suffix).map((text): ResumeDiffLine => ({ text, type: 'added' })),
      ...afterLines.slice(afterLines.length - suffix).map((text): ResumeDiffLine => ({ text, type: 'unchanged' })),
    ],
  };
}

export function buildResumeDiff(beforeText: string, afterText: string): ResumeDiffResult {
  const sanitizedBefore = sanitizeMarkdownImagesForAi(beforeText);
  const sanitizedAfter = sanitizeMarkdownImagesForAi(afterText);
  const beforeLines = sanitizedBefore.split('\n');
  const afterLines = sanitizedAfter.split('\n');
  if (
    beforeLines.length > MAX_EXACT_DIFF_LINES ||
    afterLines.length > MAX_EXACT_DIFF_LINES ||
    beforeLines.length * afterLines.length > MAX_EXACT_DIFF_CELLS
  ) {
    return buildFallbackResumeDiff(beforeLines, afterLines);
  }
  return buildDetailedResumeDiff(beforeLines, afterLines);
}

function buildDetailedResumeDiff(beforeLines: string[], afterLines: string[]): ResumeDiffResult {
  const before: ResumeDiffLine[] = [];
  const after: ResumeDiffLine[] = [];
  const lcs = buildLcsMatrix(beforeLines, afterLines);
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < beforeLines.length && newIndex < afterLines.length) {
    if (beforeLines[oldIndex] === afterLines[newIndex]) {
      before.push({ text: beforeLines[oldIndex], type: 'unchanged' });
      after.push({ text: afterLines[newIndex], type: 'unchanged' });
      oldIndex += 1;
      newIndex += 1;
    } else if (lcs[oldIndex + 1][newIndex] >= lcs[oldIndex][newIndex + 1]) {
      before.push({ text: beforeLines[oldIndex], type: 'removed' });
      oldIndex += 1;
    } else {
      after.push({ text: afterLines[newIndex], type: 'added' });
      newIndex += 1;
    }
  }

  while (oldIndex < beforeLines.length) {
    before.push({ text: beforeLines[oldIndex], type: 'removed' });
    oldIndex += 1;
  }
  while (newIndex < afterLines.length) {
    after.push({ text: afterLines[newIndex], type: 'added' });
    newIndex += 1;
  }
  return { before, after };
}
