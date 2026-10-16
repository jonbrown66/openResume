import { describe, expect, it } from 'vitest';
import { asBulletList, inferResumeSectionType } from '@/utils/resumeSections';

describe('simple resume sections', () => {
  it.each([
    ['教育经历', 'education'], ['项目经历', 'project'], ['工作经历', 'experience'], ['专业技能', 'skill'],
    ['Education', 'education'], ['Projects', 'project'], ['Work Experience', 'experience'], ['Other', 'custom'],
  ])('classifies %s without allowing the generic experience word to override its type', (title, expected) => {
    expect(inferResumeSectionType(title)).toBe(expected);
  });
  it('turns plain lines into bullets while preserving existing lists and blank lines', () => {
    const value = 'React\n**TypeScript**\n\n- CSS\n1. Testing';
    expect(asBulletList(value)).toBe('- React\n- **TypeScript**\n\n- CSS\n1. Testing');
    expect(asBulletList(asBulletList(value))).toBe(asBulletList(value));
  });
});
