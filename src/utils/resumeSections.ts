export type ResumeSectionType = 'experience' | 'education' | 'project' | 'skill' | 'custom';

export function inferResumeSectionType(title: string): ResumeSectionType {
  if (/教育|学历|education/i.test(title)) return 'education';
  if (/项目|project/i.test(title)) return 'project';
  if (/技能|能力|skill/i.test(title)) return 'skill';
  if (/工作|经历|work|experience/i.test(title)) return 'experience';
  return 'custom';
}

export function asBulletList(value: string) {
  return value.split('\n').map(line => !line.trim() || /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(line) ? line : `- ${line.trim()}`).join('\n');
}

export const sectionNames = {
  zh: { experience: '工作经历', education: '教育经历', project: '项目经历', skill: '技能', custom: '自定义章节' },
  en: { experience: 'Work Experience', education: 'Education', project: 'Projects', skill: 'Skills', custom: 'Custom Section' },
};
