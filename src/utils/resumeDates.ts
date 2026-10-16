export interface ResumeMonth { year: number; month: number }
export interface ResumeDateRange { start?: ResumeMonth; end?: ResumeMonth; ongoing: boolean }
const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const fullMonthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function parseResumeMonth(value: string): ResumeMonth | undefined {
  const numeric = value.trim().match(/^(\d{4})(?:[./-](\d{1,2})|年(\d{1,2})月)$/);
  const english = value.trim().match(/^([a-z]+)\.?\s+(\d{4})$/i);
  const year = numeric ? Number(numeric[1]) : english ? Number(english[2]) : 0;
  const name = english?.[1].toLowerCase().replace(/^sept$/, 'sep');
  const month = numeric ? Number(numeric[2] ?? numeric[3]) : name ? fullMonthNames.findIndex((full, index) => full === name || monthNames[index] === name) + 1 : 0;
  return year >= 1 && month >= 1 && month <= 12 ? { year, month } : undefined;
}
export function parseResumeDateRange(value: string): ResumeDateRange {
  const token = '(?:\\d{4}(?:[./-]\\d{1,2}|年\\d{1,2}月)|[a-z]+\\.?\\s+\\d{4})';
  const match = value.trim().match(new RegExp(`^(${token})\\s*(?:-|–|—|~|至|to)\\s*(${token}|至今|现在|present|current)$`, 'i'));
  if (!match) return { ongoing: false };
  const start = parseResumeMonth(match[1]);
  const ongoing = /^(至今|现在|present|current)$/i.test(match[2]);
  const end = ongoing ? undefined : parseResumeMonth(match[2]);
  return start && (ongoing || end) ? { start, end, ongoing } : { ongoing: false };
}
export function validResumeDateRange(range: ResumeDateRange) {
  const validMonth = (value?: ResumeMonth) => value && Number.isInteger(value.year) && value.year >= 1 && value.year <= 9999
    && Number.isInteger(value.month) && value.month >= 1 && value.month <= 12;
  return Boolean(validMonth(range.start) && (range.ongoing || validMonth(range.end) && range.start!.year * 12 + range.start!.month <= range.end!.year * 12 + range.end!.month));
}
export function formatResumeDateRange(range: ResumeDateRange, lang: 'zh' | 'en') {
  if (!validResumeDateRange(range)) return '';
  const format = (date: ResumeMonth) => `${String(date.year).padStart(4, '0')}.${String(date.month).padStart(2, '0')}`;
  return `${format(range.start!)} - ${range.ongoing ? (lang === 'zh' ? '至今' : 'Present') : format(range.end!)}`;
}
