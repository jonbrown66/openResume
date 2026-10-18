import { describe, expect, it } from 'vitest';

import { buildResumeDiff } from '@/utils/resumeDiff';

describe('buildResumeDiff', () => {
  it('marks removed lines in red and added lines in green groups', () => {
    const diff = buildResumeDiff('line one\nline two', 'line one\nline three');

    expect(diff.before.some((line) => line.type === 'removed' && line.text === 'line two')).toBe(true);
    expect(diff.after.some((line) => line.type === 'added' && line.text === 'line three')).toBe(true);
  });

  it('sanitizes base64 avatar images in the diff output', () => {
    const before = 'image: "data:image/png;base64,iVBORw0KGgoAAAASDFASF"\nline two';
    const after = 'image: "data:image/png;base64,iVBORw0KGgoAAAASDFASF"\nline three';
    const diff = buildResumeDiff(before, after);

    expect(diff.before.some((line) => line.text.includes('[avatar]'))).toBe(true);
    expect(diff.after.some((line) => line.text.includes('[avatar]'))).toBe(true);
    expect(diff.before.some((line) => line.text.includes('iVBORw0KGgo'))).toBe(false);
    expect(diff.after.some((line) => line.text.includes('iVBORw0KGgo'))).toBe(false);
  });

  it('keeps the exact diff while the line counts stay small', () => {
    const before = ['a', 'b', 'c', 'd'].join('\n');
    const after = ['a', 'x', 'c', 'd'].join('\n');
    const diff = buildResumeDiff(before, after);

    expect(diff.before).toEqual([
      { text: 'a', type: 'unchanged' },
      { text: 'b', type: 'removed' },
      { text: 'c', type: 'unchanged' },
      { text: 'd', type: 'unchanged' },
    ]);
    expect(diff.after).toEqual([
      { text: 'a', type: 'unchanged' },
      { text: 'x', type: 'added' },
      { text: 'c', type: 'unchanged' },
      { text: 'd', type: 'unchanged' },
    ]);
  });

  it('uses a linear fallback for very long resumes without dropping lines', () => {
    const beforeLines = Array.from({ length: 450 }, (_, index) => `line ${index}`);
    const afterLines = [...beforeLines];
    afterLines[225] = 'revised line';

    const diff = buildResumeDiff(beforeLines.join('\n'), afterLines.join('\n'));

    expect(diff.before).toHaveLength(beforeLines.length);
    expect(diff.after).toHaveLength(afterLines.length);
    expect(diff.before.filter((line) => line.type === 'removed')).toEqual([
      { text: 'line 225', type: 'removed' },
    ]);
    expect(diff.after.filter((line) => line.type === 'added')).toEqual([
      { text: 'revised line', type: 'added' },
    ]);
  });
});
