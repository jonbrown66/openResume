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

function buildLcsMatrix(before: string[], after: string[]) {
  const matrix = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      if (before[i] === after[j]) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  return matrix;
}

export function buildResumeDiff(beforeText: string, afterText: string): ResumeDiffResult {
  const sanitizedBefore = sanitizeMarkdownImagesForAi(beforeText);
  const sanitizedAfter = sanitizeMarkdownImagesForAi(afterText);
  const beforeLines = sanitizedBefore.split('\n');
  const afterLines = sanitizedAfter.split('\n');
  const lcs = buildLcsMatrix(beforeLines, afterLines);

  const before: ResumeDiffLine[] = [];
  const after: ResumeDiffLine[] = [];

  let i = 0;
  let j = 0;

  while (i < beforeLines.length && j < afterLines.length) {
    if (beforeLines[i] === afterLines[j]) {
      before.push({ text: beforeLines[i], type: 'unchanged' });
      after.push({ text: afterLines[j], type: 'unchanged' });
      i += 1;
      j += 1;
      continue;
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      before.push({ text: beforeLines[i], type: 'removed' });
      i += 1;
    } else {
      after.push({ text: afterLines[j], type: 'added' });
      j += 1;
    }
  }

  while (i < beforeLines.length) {
    before.push({ text: beforeLines[i], type: 'removed' });
    i += 1;
  }

  while (j < afterLines.length) {
    after.push({ text: afterLines[j], type: 'added' });
    j += 1;
  }

  return { before, after };
}
