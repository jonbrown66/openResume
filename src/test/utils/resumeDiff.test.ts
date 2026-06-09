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
});
