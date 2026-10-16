import { describe, expect, it } from 'vitest';
import { parseResumeDateRange, parseResumeMonth, validResumeDateRange, formatResumeDateRange } from '@/utils/resumeDates';

describe('resume month ranges', () => {
  it.each(['2023.06', '2023/6', '2023-06', '2023年6月', 'Jun 2023', 'June 2023'])('reads %s without using locale-dependent Date parsing', value => {
    expect(parseResumeMonth(value)).toEqual({ year: 2023, month: 6 });
  });
  it.each(['2023.00', '2023.13', '2023', 'Juniper 2023', '2023.06 | Remote'])('keeps unsupported %s as custom text', value => {
    expect(parseResumeMonth(value)).toBeUndefined();
  });
  it('reads imported English and compact numeric ranges and formats a stable monthly range', () => {
    const expected = { start: { year: 2020, month: 1 }, end: { year: 2024, month: 6 }, ongoing: false };
    expect(parseResumeDateRange('Jan 2020 - June 2024')).toEqual(expected);
    expect(parseResumeDateRange('2020-01—2024-06')).toEqual(expected);
    expect(formatResumeDateRange(expected, 'zh')).toBe('2020.01 - 2024.06');
  });
  it('supports Present and 至今 without inventing an end date', () => {
    const range = parseResumeDateRange('2023年6月 - 至今');
    expect(range.ongoing).toBe(true);
    expect(range.end).toBeUndefined();
    expect(formatResumeDateRange(range, 'en')).toBe('2023.06 - Present');
    expect(parseResumeDateRange('Jun 2023 - Present')).toEqual(range);
  });
  it('rejects reversed, incomplete and invalid ranges', () => {
    expect(validResumeDateRange(parseResumeDateRange('2024.01 - 2023.01'))).toBe(false);
    expect(formatResumeDateRange({ start: { year: 2023, month: 13 }, ongoing: true }, 'zh')).toBe('');
    expect(validResumeDateRange({ start: { year: 2024, month: 1 }, ongoing: false })).toBe(false);
    expect(validResumeDateRange(parseResumeDateRange('2024.01 - 2024.01'))).toBe(true);
  });
});
