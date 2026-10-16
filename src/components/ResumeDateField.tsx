import { useId, useState, useRef, type RefObject } from 'react';
import { CalendarDays } from 'lucide-react';
import type { AppLanguage } from '@/config/ui';
import { parseResumeDateRange, validResumeDateRange, formatResumeDateRange, type ResumeMonth } from '@/utils/resumeDates';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { AnchoredPanel } from './ui/AnchoredPanel';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function MonthRow({ label, value, onChange, lang, years, currentYear, disabled = false }: {
  label: string; value?: ResumeMonth; onChange: (value: ResumeMonth) => void; lang: AppLanguage; years: number[]; currentYear: number; disabled?: boolean;
}) {
  const [year, setYear] = useState(value?.year ?? currentYear);
  const zh = lang === 'zh';
  return <fieldset disabled={disabled} className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 ${disabled ? 'opacity-45' : ''}`}>
    <legend className="sr-only">{label}</legend>
    <span aria-hidden="true" className="text-xs font-medium">{label}</span>
    <Select value={String(year)} disabled={disabled} items={years.map(item => ({ value: String(item), label: String(item) }))}
      onValueChange={next => { if (next) { setYear(Number(next)); if (value) onChange({ ...value, year: Number(next) }); } }}>
      <SelectTrigger aria-label={zh ? `${label}年份` : `${label} year`}><SelectValue /></SelectTrigger>
      <SelectContent>{years.map(item => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={value ? String(value.month) : null} disabled={disabled}
      items={monthLabels.map((name, i) => ({ value: String(i + 1), label: zh ? `${i + 1}月` : name }))}
      onValueChange={next => { if (next) onChange({ year, month: Number(next) }); }}>
      <SelectTrigger aria-label={zh ? `${label}月份` : `${label} month`}><SelectValue placeholder={zh ? '月份' : 'Month'} /></SelectTrigger>
      <SelectContent>{monthLabels.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{zh ? `${i + 1}月` : name}</SelectItem>)}</SelectContent>
    </Select>
  </fieldset>;
}

function DateRangePicker({ value, lang, onApply, onClear, onClose, triggerRef }: {
  value: string; lang: AppLanguage; onApply: (value: string) => void; onClear: () => void;
  onClose: () => void; triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const zh = lang === 'zh';
  const [range, setRange] = useState(() => parseResumeDateRange(value));
  const [currentYear] = useState(() => new Date().getFullYear());
  const minimum = Math.min(1950, range.start?.year ?? currentYear, range.end?.year ?? currentYear);
  const maximum = Math.max(currentYear + 10, range.start?.year ?? currentYear, range.end?.year ?? currentYear);
  const years = Array.from({ length: maximum - minimum + 1 }, (_, i) => maximum - i);
  const valid = validResumeDateRange(range);
  const reversed = Boolean(range.start && range.end && !range.ongoing && !valid);
  return <AnchoredPanel title={zh ? '选择经历时间' : 'Choose dates'} closeLabel={zh ? '关闭日期选择器' : 'Close date picker'}
    width={300} compactPanel triggerRef={triggerRef} onClose={onClose}
    footer={<div className="flex items-center justify-between gap-2">
      <button type="button" className="app-control min-h-11 rounded-lg px-3 text-sm" onClick={onClear}>{zh ? '清空' : 'Clear'}</button>
      <button type="button" className="app-primary min-h-11 rounded-lg px-4 text-sm" disabled={!valid} onClick={() => onApply(formatResumeDateRange(range, lang))}>{zh ? '应用日期' : 'Apply dates'}</button>
    </div>}>
    <div className="space-y-3">
      <MonthRow label={zh ? '开始' : 'Start'} value={range.start} lang={lang} years={years} currentYear={currentYear} onChange={start => setRange(previous => ({ ...previous, start }))} />
      <MonthRow label={zh ? '结束' : 'End'} value={range.end} lang={lang} years={years} currentYear={currentYear} disabled={range.ongoing} onChange={end => setRange(previous => ({ ...previous, end }))} />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" data-ui-plain className="size-4 accent-[var(--ui-focus)]" checked={range.ongoing} onChange={event => setRange(previous => ({ ...previous, ongoing: event.target.checked }))} />
        {zh ? '至今' : 'Present'}
      </label>
      {reversed && <p role="status" className="text-xs leading-relaxed text-muted-foreground">{zh ? '结束月份不能早于开始月份。' : 'End month must not be before start month.'}</p>}
      {value && !parseResumeDateRange(value).start && <p className="text-xs text-muted-foreground">{zh ? '当前为自定义时间，应用日期后将替换。' : 'Applying dates will replace your custom date text.'}</p>}
    </div>
  </AnchoredPanel>;
}

export function ResumeDateField({ label, value, onChange, lang }: { label: string; value: string; onChange: (value: string) => void; lang: AppLanguage }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const zh = lang === 'zh';
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-xs font-medium text-[var(--ui-text-secondary)]">{label}</label>
    <div className="flex items-center gap-2">
      <input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={zh ? '2023.06 - 至今' : '2023.06 - Present'}
        className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm" />
      <button type="button" ref={triggerRef} onClick={() => setOpen(previous => !previous)} aria-haspopup="dialog" aria-expanded={open}
        aria-label={zh ? '选择日期' : 'Choose dates'} title={zh ? '选择年月范围，也可直接输入' : 'Choose months or type dates directly'}
        className="app-secondary inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border"><CalendarDays size={16} aria-hidden="true" /></button>
    </div>
    {open && <DateRangePicker value={value} lang={lang} triggerRef={triggerRef} onClose={() => setOpen(false)}
      onClear={() => { onChange(''); setOpen(false); }} onApply={next => { onChange(next); setOpen(false); }} />}
  </div>;
}
