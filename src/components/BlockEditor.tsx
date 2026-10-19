import { memo, useState, useCallback, useRef, useId } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, List } from 'lucide-react';
import type { AppLanguage, TranslationSet } from '@/config/ui';
import type { ResumeDraft, ResumeSection, ResumeEntry } from '@/types/resume';
import { inferResumeSectionType, asBulletList, sectionNames, type ResumeSectionType } from '@/utils/resumeSections';
import { AvatarUpload } from './AvatarUpload';
import { ResumeDateField } from './ResumeDateField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

export interface BlockEditorProps { draft: ResumeDraft; lang: AppLanguage; translations: TranslationSet; onChange: (draft: ResumeDraft) => void }
const fieldClass = 'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm';
const actionClass = 'app-control inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs';

function Field({ label, value, onChange, multiline = false, hint, placeholder, lang = 'zh' }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string; placeholder?: string; lang?: AppLanguage;
}) {
  const id = useId();
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs font-medium text-[var(--ui-text-secondary)]">{label}</label>
      {multiline && <button type="button" className={actionClass} onClick={() => onChange(asBulletList(value))}
        title={lang === 'zh' ? '将每行转为列表，已有列表保持不变' : 'Make each line a bullet; keep existing lists'}
        aria-label={lang === 'zh' ? `${label}：转为列表` : `Make ${label} a list`}><List size={14} aria-hidden="true" />{lang === 'zh' ? '分点' : 'List'}</button>}
    </div>
    {multiline ? <textarea id={id} aria-describedby={hint ? `${id}-hint` : undefined} value={value} onChange={event => onChange(event.target.value)}
      placeholder={placeholder} className={`${fieldClass} min-h-24 resize-y leading-relaxed`} />
      : <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={fieldClass} />}
    {hint && <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
  </div>;
}

export const BlockEditor = memo(function BlockEditor({ draft, lang, translations: t, onChange }: BlockEditorProps) {
  const [state, setState] = useState(draft);
  const [previousDraft, setPreviousDraft] = useState(draft);
  const stateRef = useRef(draft);
  if (previousDraft !== draft) {
    setPreviousDraft(draft);
    setState(draft);
    stateRef.current = draft;
  }
  const zh = lang === 'zh';
  const sectionPickerId = useId();
  const update = useCallback((updater: (prev: ResumeDraft) => ResumeDraft) => {
    const next = updater(stateRef.current); stateRef.current = next; setState(next); onChange(next);
  }, [onChange]);
  const updateSection = (index: number, updater: (section: ResumeSection) => ResumeSection) => update(prev => ({ ...prev,
    sections: prev.sections.map((section, i) => i === index ? updater(section) : section),
  }));
  const updateEntry = (sectionIndex: number, entryIndex: number, patch: Partial<ResumeEntry>) => updateSection(sectionIndex,
    section => ({ ...section, entries: section.entries.map((entry, i) => i === entryIndex ? { ...entry, ...patch } : entry) }));
  const moveSection = (index: number, offset: number) => update(prev => {
    const target = index + offset;
    if (target < 0 || target >= prev.sections.length) return prev;
    const sections = [...prev.sections]; [sections[index], sections[target]] = [sections[target], sections[index]];
    return { ...prev, sections };
  });
  const addSection = (type: ResumeSectionType) => update(prev => ({ ...prev, sections: [...prev.sections, {
    id: crypto.randomUUID(), title: sectionNames[lang][type], content: '', entries: [],
  }] }));
  const bodyHint = zh ? '每行写一项，点“分点”变成列表；可用 **文字** 加粗。' : 'Write one item per line and choose List. Use **text** for bold.';

  return <div className="space-y-6 px-4 pbs-3 pbe-6 text-sm text-[var(--secondary-foreground)] sm:px-6">
    <section aria-label={zh ? '基本信息' : 'Basic information'} className="space-y-4">
      <h2 className="font-semibold">{zh ? '基本信息' : 'Basic information'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.fieldName} value={state.frontmatter.name} onChange={name => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, name } }))} />
        <Field label={t.fieldTitle} value={state.frontmatter.title} onChange={title => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, title } }))} />
      </div>
      <Field label={t.fieldContact} value={state.frontmatter.contact} placeholder={zh ? '邮箱 | 电话 | 城市' : 'Email | Phone | City'}
        hint={zh ? '多项信息用 | 分开；这里只填文字或网址。' : 'Separate items with |. Enter plain text or URLs.'}
        onChange={contact => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, contact } }))} />
      <AvatarUpload value={state.frontmatter.image} onChange={image => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, image } }))} lang={lang} />
    </section>
    <Field label={t.fieldSummary} value={state.summary} multiline lang={lang}
      placeholder={zh ? '用两三句话说明经验、专长和求职方向。' : 'Describe your experience, strengths and goals in a few sentences.'}
      onChange={summary => update(prev => ({ ...prev, summary }))} />

    {state.sections.map((section, sectionIndex) => {
      const type = inferResumeSectionType(section.title);
      const simple = type === 'skill' || type === 'custom';
      const headingLabel = type === 'education' ? (zh ? '专业 / 学历' : 'Major / Degree')
        : type === 'project' ? (zh ? '项目名称' : 'Project name') : type === 'experience' ? (zh ? '职位' : 'Role') : (zh ? '分组名称（可选）' : 'Group name (optional)');
      const orgLabel = type === 'education' ? (zh ? '学校' : 'School') : type === 'experience' ? (zh ? '公司' : 'Company') : (zh ? '所属组织（可选）' : 'Organization (optional)');
      const contentLabel = type === 'experience' ? (zh ? '职责与成果' : 'Responsibilities and results') : type === 'project' ? (zh ? '项目成果' : 'Project results') : (zh ? '补充说明' : 'Details');
      const addLabel = zh ? (type === 'experience' ? '添加工作经历' : type === 'education' ? '添加教育经历' : type === 'project' ? '添加项目经历' : '添加分组')
        : (type === 'experience' ? 'Add work experience' : type === 'education' ? 'Add education' : type === 'project' ? 'Add project' : 'Add group');
      return <section key={section.id ?? sectionIndex} aria-label={section.title || (zh ? '未命名章节' : 'Untitled section')}
        className="app-surface space-y-4 border p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1"><Field label={zh ? '章节名称' : 'Section name'} value={section.title} onChange={title => updateSection(sectionIndex, current => ({ ...current, title }))} /></div>
          <div className="flex items-center">
            <button type="button" className={actionClass} disabled={sectionIndex === 0} aria-label={zh ? `上移${section.title}` : `Move ${section.title} up`} onClick={() => moveSection(sectionIndex, -1)}><ArrowUp size={14} /></button>
            <button type="button" className={actionClass} disabled={sectionIndex === state.sections.length - 1} aria-label={zh ? `下移${section.title}` : `Move ${section.title} down`} onClick={() => moveSection(sectionIndex, 1)}><ArrowDown size={14} /></button>
            <button type="button" className={`${actionClass} ui-destructive-subtle`} aria-label={zh ? `删除章节：${section.title}` : `Delete section: ${section.title}`}
              onClick={() => update(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== sectionIndex) }))}><Trash2 size={14} />{zh ? '删除' : 'Delete'}</button>
          </div>
        </div>
        {simple ? <Field label={type === 'skill' ? (zh ? '技能清单' : 'Skills list') : (zh ? '章节内容' : 'Section text')}
          value={section.content} multiline lang={lang} hint={bodyHint} onChange={content => updateSection(sectionIndex, current => ({ ...current, content }))} />
          : <details open={section.content ? true : undefined} className="text-xs text-muted-foreground">
            <summary className="cursor-pointer py-2">{zh ? '章节介绍（可选）' : 'Section introduction (optional)'}</summary>
            <Field label={zh ? '章节介绍' : 'Section introduction'} value={section.content} multiline lang={lang}
              onChange={content => updateSection(sectionIndex, current => ({ ...current, content }))} />
          </details>}
        {section.entries.map((entry, entryIndex) => <fieldset key={entry.id ?? entryIndex} className="ui-entry-card space-y-3 border bg-[var(--app-surface-muted)] p-3">
          <legend className="sr-only">{section.title} {entryIndex + 1}</legend>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">{zh ? `第 ${entryIndex + 1} 条` : `Entry ${entryIndex + 1}`}</p>
            <button type="button" className={`${actionClass} ui-destructive-subtle`} aria-label={zh ? `删除${section.title}第${entryIndex + 1}条` : `Delete ${section.title} entry ${entryIndex + 1}`}
              onClick={() => updateSection(sectionIndex, current => ({ ...current, entries: current.entries.filter((_, i) => i !== entryIndex) }))}><Trash2 size={14} />{zh ? '删除' : 'Delete'}</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={headingLabel} value={entry.heading} onChange={heading => updateEntry(sectionIndex, entryIndex, { heading })} />
            {(!simple || entry.meta) && <ResumeDateField label={t.entryMeta} value={entry.meta} lang={lang} onChange={meta => updateEntry(sectionIndex, entryIndex, { meta })} />}
          </div>
          {(!simple || entry.organization) && <Field label={orgLabel} value={entry.organization} onChange={organization => updateEntry(sectionIndex, entryIndex, { organization })} />}
          <Field label={simple ? (zh ? '分组内容' : 'Group content') : contentLabel} value={entry.content} multiline lang={lang} hint={bodyHint}
            onChange={content => updateEntry(sectionIndex, entryIndex, { content })} />
        </fieldset>)}
        {(!simple || section.entries.length > 0) && <button type="button" className="app-control inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--app-border)] px-3"
          onClick={() => updateSection(sectionIndex, current => ({ ...current, entries: [...current.entries, { id: crypto.randomUUID(), heading: '', meta: '', organization: '', content: '' }] }))}>
          <Plus size={16} aria-hidden="true" />{addLabel}
        </button>}
      </section>;
    })}
    <div className="space-y-2">
      <label htmlFor={sectionPickerId} className="block text-xs font-medium text-[var(--ui-text-secondary)]">{zh ? '添加章节' : 'Add section'}</label>
      <Select value={null} items={Object.entries(sectionNames[lang]).map(([value, label]) => ({ value, label }))}
        onValueChange={value => { if (value) addSection(value as ResumeSectionType); }}>
        <SelectTrigger id={sectionPickerId} aria-label={zh ? '添加章节' : 'Add section'}><SelectValue placeholder={zh ? '选择要添加的内容…' : 'Choose a section…'} /></SelectTrigger>
        <SelectContent>{Object.entries(sectionNames[lang]).map(([type, label]) => <SelectItem key={type} value={type}>{label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <p className="text-xs text-muted-foreground">{zh ? '修改会自动保存；误删或改错可用上方“撤销”。' : 'Changes save automatically. Use Undo above to restore accidental edits or deletions.'}</p>
  </div>;
});
