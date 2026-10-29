import { describe, expect, it } from 'vitest';
import { inferResumeSectionType, normalizeSkillLines } from '@/utils/resumeSections';

describe('simple resume sections', () => {
  it('turns plain skill lines into bullets while preserving existing lines and blanks', () => {
    expect(normalizeSkillLines('React\nTypeScript\n\n- CSS\n1. Testing')).toBe('- React\n- TypeScript\n\n- CSS\n1. Testing');
  });

  it.each([
    ['教育经历', 'education'], ['项目经历', 'project'], ['工作经历', 'experience'], ['专业技能', 'skill'],
    ['Education', 'education'], ['Projects', 'project'], ['Work Experience', 'experience'], ['Other', 'custom'],
  ])('classifies %s without allowing the generic experience word to override its type', (title, expected) => {
    expect(inferResumeSectionType(title)).toBe(expected);
  });
});
