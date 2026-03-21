import { describe, expect, it } from 'vitest';

import { buildResumeDiff } from '@/utils/resumeDiff';

describe('buildResumeDiff', () => {
  it('marks removed lines in red and added lines in green groups', () => {
    const diff = buildResumeDiff('line one\nline two', 'line one\nline three');

    expect(diff.before.some((line) => line.type === 'removed' && line.text === 'line two')).toBe(true);
    expect(diff.after.some((line) => line.type === 'added' && line.text === 'line three')).toBe(true);
  });
});
