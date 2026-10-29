import type { ResumeSection, ResumeSectionType } from '@/types/resume';
export type { ResumeSectionType } from '@/types/resume';

export function isResumeSectionType(value: unknown): value is ResumeSectionType {
  return ['experience', 'education', 'project', 'skill', 'custom'].includes(value as string);
}

export function getResumeSectionType(section: ResumeSection): ResumeSectionType {
  return section.type ?? inferResumeSectionType(section.title);
}

export function getEntrySummary(entry: { organization: string; heading: string; meta: string }, fallback: string) {
  return [entry.organization, entry.heading, entry.meta].map(value => value.trim()).filter(Boolean).join(' · ') || fallback;
}

export function normalizeSkillLines(value: string) {
  let inCode = false;
  return value.split('\n').map(line => {
    const text = line.trim();
    if (/^(?:```|~~~)/.test(text)) { inCode = !inCode; return line; }
    if (inCode || !text || /^\s/.test(line)) return line;
    if (/^(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>|\||<|!\[)/.test(text)) return line;
    return `- ${text}`;
  }).join('\n');
}

export function inferResumeSectionType(title: string): ResumeSectionType {
  if (/教育|学历|education/i.test(title)) return 'education';
  if (/项目|project/i.test(title)) return 'project';
  if (/技能|能力|skill/i.test(title)) return 'skill';
  if (/工作|经历|work|experience/i.test(title)) return 'experience';
  return 'custom';
}

export const sectionNames = {
  zh: { experience: '工作经历', education: '教育经历', project: '项目经历', skill: '技能', custom: '自定义章节' },
  en: { experience: 'Work Experience', education: 'Education', project: 'Projects', skill: 'Skills', custom: 'Custom Section' },
};
