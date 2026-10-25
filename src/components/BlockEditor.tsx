import { memo, useState, useCallback, useRef, useId, useLayoutEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, List, ChevronDown, ChevronRight, Undo2, MoreHorizontal } from 'lucide-react';
import type { AppLanguage, TranslationSet } from '@/config/ui';
import type { ResumeDraft, ResumeSection, ResumeEntry } from '@/types/resume';
import { getResumeSectionType, getEntrySummary, asBulletList, sectionNames, type ResumeSectionType } from '@/utils/resumeSections';
import { withDraftIds } from '@/utils/validation';
import { AvatarUpload } from './AvatarUpload';
import { ResumeDateField } from './ResumeDateField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

export interface BlockEditorProps { draft: ResumeDraft; lang: AppLanguage; translations: TranslationSet; onChange: (draft: ResumeDraft) => void }
const fieldClass = 'min-w-0 w-full rounded-[var(--ui-radius-control)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm';
const actionClass = 'app-control inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-[var(--ui-radius-control)] px-1 text-xs sm:min-h-8 sm:min-w-8';

function Field({ label, value, onChange, multiline = false, hint, placeholder, lang = 'zh' }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string; placeholder?: string; lang?: AppLanguage;
}) {
  const id = useId();
  return <div className="space-y-1">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs font-medium text-[var(--ui-text-secondary)]">{label}</label>
      {multiline && <button type="button" className="app-control inline-flex min-h-10 items-center justify-center gap-1 rounded-[var(--ui-radius-control)] px-2 text-xs sm:min-h-7" onClick={() => onChange(asBulletList(value))}
        title={lang === 'zh' ? '将每行转为列表，已有列表保持不变' : 'Make each line a bullet; keep existing lists'}
        aria-label={lang === 'zh' ? `${label}：转为列表` : `Make ${label} a list`}><List size={14} aria-hidden="true" />{lang === 'zh' ? '分点' : 'List'}</button>}
    </div>
    {multiline ? <textarea id={id} aria-describedby={hint ? `${id}-hint` : undefined} value={value} onChange={event => onChange(event.target.value)}
      placeholder={placeholder} rows={3} className={`${fieldClass} min-h-20 resize-y leading-relaxed`} />
      : <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={fieldClass} />}
    {hint && <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
  </div>;
}

export const BlockEditor = memo(function BlockEditor({ draft, lang, translations: t, onChange }: BlockEditorProps) {
  const [state, setState] = useState(() => withDraftIds(draft));
  const [previousDraft, setPreviousDraft] = useState(draft);
  const stateRef = useRef(state);
  if (previousDraft !== draft) {
    setPreviousDraft(draft);
    const next = withDraftIds(draft);
    setState(next);
    stateRef.current = next;
  }
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [deleted, setDeleted] = useState<Array<{ sectionId?: string; item: ResumeSection | ResumeEntry; index: number; nextId?: string }>>([]);
  useLayoutEffect(() => {
    if (!focusId) return;
    const target = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${focusId}"]`);
    target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    target?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    setFocusId(null);
  }, [focusId]);
  const toggle = (id: string) => setCollapsed(previous => {
    const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
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
  const reveal = (id: string, parentId?: string) => {
    setCollapsed(previous => { const next = new Set(previous); next.delete(id); if (parentId) next.delete(parentId); return next; });
    setFocusId(id);
  };
  const addSection = (type: ResumeSectionType) => {
    const id = crypto.randomUUID();
    update(prev => ({ ...prev, sections: [...prev.sections, { id, type, title: sectionNames[lang][type], content: '', entries: [] }] }));
    reveal(id);
  };
  const remove = (sectionIndex: number, entryIndex?: number) => {
    const section = stateRef.current.sections[sectionIndex];
    const items = entryIndex === undefined ? stateRef.current.sections : section.entries;
    const index = entryIndex ?? sectionIndex;
    setDeleted(previous => [...previous.filter(record => record.item.id !== items[index].id), { sectionId: entryIndex === undefined ? undefined : section.id, item: items[index], index, nextId: items[index + 1]?.id }]);
    if (entryIndex === undefined) update(prev => ({ ...prev, sections: prev.sections.filter(item => item.id !== section.id) }));
    else updateSection(sectionIndex, current => ({ ...current, entries: current.entries.filter((_, i) => i !== entryIndex) }));
  };
  const undoNotices = (sectionId: string | undefined, index: number, last = false) => deleted.filter(record => {
    const items = sectionId ? state.sections.find(section => section.id === sectionId)?.entries : state.sections;
    return record.sectionId === sectionId && items && !items.some(item => item.id === record.item.id) && (last ? record.index >= index : record.index === index);
  }).map(record => <div key={record.item.id} role="status" className="flex min-w-0 items-center justify-between gap-2 py-2 text-xs">
    <span>{zh ? '已删除' : 'Deleted'} {('title' in record.item ? record.item.title : getEntrySummary(record.item, zh ? '新经历' : 'New entry'))}</span>
    <button type="button" className={actionClass} onClick={() => {
      update(prev => {
        const restore = <T extends ResumeSection | ResumeEntry,>(items: T[]) => {
          if (items.some(item => item.id === record.item.id)) return items;
          const next = [...items]; const neighbor = next.findIndex(item => item.id === record.nextId);
          next.splice(neighbor < 0 ? Math.min(record.index, next.length) : neighbor, 0, record.item as T); return next;
        };
        return sectionId ? { ...prev, sections: prev.sections.map(section => section.id === sectionId ? { ...section, entries: restore(section.entries) } : section) }
          : { ...prev, sections: restore(prev.sections) };
      });
      reveal(record.item.id!, sectionId);
    }}><Undo2 size={14} aria-hidden="true" />{zh ? '撤销删除' : 'Undo deletion'}</button>
  </div>);
  const bodyHint = zh ? '每行写一项，点“分点”变成列表；可用 **文字** 加粗。' : 'Write one item per line and choose List. Use **text** for bold.';

  return <div ref={rootRef} className="space-y-3 px-3 pbs-2 pbe-2 text-sm text-[var(--secondary-foreground)] sm:px-4 sm:pbe-4">
    <div className="flex items-center justify-between gap-2 border-b border-[var(--app-border)] pb-2.5 pt-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-text-secondary)]">{zh ? '简历章节' : 'Sections'}</span>
      <div className="shrink-0">
      <Select value={null} items={Object.entries(sectionNames[lang]).map(([value, label]) => ({ value, label }))}
        onValueChange={value => { if (value) addSection(value as ResumeSectionType); }}>
        <SelectTrigger id={sectionPickerId} aria-label={zh ? '添加章节' : 'Add section'} data-size="sm" className="h-8 w-auto text-xs font-medium"><SelectValue className="flex-none overflow-visible text-clip whitespace-nowrap" placeholder={zh ? '＋ 添加章节' : '+ Add section'} /></SelectTrigger>
        <SelectContent style={{ minWidth: 200 }}>{Object.entries(sectionNames[lang]).map(([type, label]) => <SelectItem key={type} value={type}>{label}</SelectItem>)}</SelectContent>
      </Select>
      </div>
    </div>
    <section aria-label={zh ? '基本信息' : 'Basic information'} className="space-y-2.5">
      <h2 className={`text-xs font-semibold text-[var(--ui-text-secondary)] ${zh ? '' : 'uppercase tracking-[0.08em]'}`}>{zh ? '基本信息' : 'Basic information'}</h2>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <Field label={t.fieldName} value={state.frontmatter.name} onChange={name => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, name } }))} />
        <Field label={t.fieldTitle} value={state.frontmatter.title} onChange={title => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, title } }))} />
      </div>
      <Field label={t.fieldContact} value={state.frontmatter.contact} placeholder={zh ? '邮箱 | 电话 | 城市' : 'Email | Phone | City'}
        hint={zh ? '多项信息用 | 分开；这里只填文字或网址。' : 'Separate items with |. Enter plain text or URLs.'}
        onChange={contact => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, contact } }))} />
      <details className="group text-xs text-[var(--ui-text-secondary)]">
        <summary className="flex cursor-pointer select-none items-center gap-1.5 py-1.5 font-medium list-none hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
          <ChevronRight size={13} className="shrink-0 transition-transform duration-150 group-open:rotate-90 text-muted-foreground" />
          <span>{zh ? `证件照（可选${state.frontmatter.image ? ' · 已添加' : ''}）` : `ID photo (optional${state.frontmatter.image ? ' · added' : ''})`}</span>
        </summary>
        <div className="pt-2 ps-4">
          <AvatarUpload value={state.frontmatter.image} onChange={image => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, image } }))} lang={lang} />
        </div>
      </details>
    </section>
    <div className="border-t border-[var(--app-border)] pt-3 space-y-1">
      <Field label={t.fieldSummary} value={state.summary} multiline lang={lang}
        placeholder={zh ? '用两三句话说明经验、专长和求职方向。' : 'Describe your experience, strengths and goals in a few sentences.'}
        onChange={summary => update(prev => ({ ...prev, summary }))} />
    </div>

    {state.sections.map((section, sectionIndex) => {
      const type = getResumeSectionType(section);
      const sectionId = section.id!;
      const sectionOpen = !collapsed.has(sectionId);
      const simple = type === 'skill' || type === 'custom';
      const headingLabel = type === 'education' ? (zh ? '专业 / 学历' : 'Major / Degree')
        : type === 'project' ? (zh ? '项目名称' : 'Project name') : type === 'experience' ? (zh ? '职位' : 'Role') : (zh ? '分组名称' : 'Group name');
      const orgLabel = type === 'education' ? (zh ? '学校' : 'School') : type === 'experience' ? (zh ? '公司' : 'Company') : (zh ? '所属组织' : 'Organization');
      const contentLabel = type === 'experience' ? (zh ? '职责与成果' : 'Responsibilities and results') : type === 'project' ? (zh ? '项目成果' : 'Project results') : (zh ? '补充说明' : 'Details');
      const addLabel = zh ? (type === 'experience' ? '添加工作经历' : type === 'education' ? '添加教育经历' : type === 'project' ? '添加项目经历' : '添加分组')
        : (type === 'experience' ? 'Add work experience' : type === 'education' ? 'Add education' : type === 'project' ? 'Add project' : 'Add group');
      return <div key={sectionId} className="space-y-2">{undoNotices(undefined, sectionIndex)}<section data-block-id={sectionId} aria-label={section.title || (zh ? '未命名章节' : 'Untitled section')}
        className="min-w-0 border-t border-[var(--app-border)] pt-3.5">
        <div className="flex items-center gap-1 rounded-[var(--ui-radius-control)] p-0.5 transition-colors hover:bg-[var(--ui-hover-bg)]">
          <button type="button" className="app-control inline-flex min-h-8 min-w-7 shrink-0 items-center justify-center rounded-[var(--ui-radius-control)] text-muted-foreground" aria-label={`${section.title || (zh ? '未命名章节' : 'Untitled section')}${section.entries.length ? ` ${section.entries.length} ${zh ? '条' : 'entries'}` : ''}`} aria-expanded={sectionOpen} aria-controls={`${sectionId}-body`} onClick={() => toggle(sectionId)}>
            {sectionOpen ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
          </button>
          <input data-ui-plain aria-label={zh ? '章节名称' : 'Section name'} title={zh ? '修改章节名称' : 'Rename section'} value={section.title}
            className="min-w-0 flex-1 rounded-[var(--ui-radius-control)] bg-transparent px-1.5 py-1 text-[14px] font-bold tracking-tight outline-none transition-colors hover:bg-[var(--app-surface)] focus-visible:bg-[var(--app-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ui-focus)]"
            onChange={event => updateSection(sectionIndex, current => ({ ...current, type, title: event.target.value }))} />
          <div className="hidden shrink-0 items-center gap-0.5 text-muted-foreground sm:flex">
            <button type="button" className={actionClass} disabled={sectionIndex === 0} aria-label={zh ? `上移${section.title}` : `Move ${section.title} up`} onClick={() => moveSection(sectionIndex, -1)}><ArrowUp size={14} /></button>
            <button type="button" className={actionClass} disabled={sectionIndex === state.sections.length - 1} aria-label={zh ? `下移${section.title}` : `Move ${section.title} down`} onClick={() => moveSection(sectionIndex, 1)}><ArrowDown size={14} /></button>
            <button type="button" className={`${actionClass} ui-destructive-subtle`} aria-label={zh ? `删除章节：${section.title}` : `Delete section: ${section.title}`}
              title={zh ? '删除章节' : 'Delete section'} onClick={() => remove(sectionIndex)}><Trash2 size={14} aria-hidden="true" /></button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={zh ? `更多章节操作：${section.title}` : `More section actions: ${section.title}`}
              className="app-control inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-[var(--ui-radius-control)] text-muted-foreground sm:hidden">
              <MoreHorizontal size={16} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={sectionIndex === 0} onClick={() => moveSection(sectionIndex, -1)}><ArrowUp size={14} aria-hidden="true" />{zh ? '上移章节' : 'Move section up'}</DropdownMenuItem>
              <DropdownMenuItem disabled={sectionIndex === state.sections.length - 1} onClick={() => moveSection(sectionIndex, 1)}><ArrowDown size={14} aria-hidden="true" />{zh ? '下移章节' : 'Move section down'}</DropdownMenuItem>
              <DropdownMenuItem data-variant="destructive" onClick={() => remove(sectionIndex)}><Trash2 size={14} aria-hidden="true" />{zh ? '删除章节' : 'Delete section'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div id={`${sectionId}-body`} hidden={!sectionOpen} className="space-y-3 pt-1.5 ps-3 border-l-2 border-[var(--app-border)] ms-2 sm:ms-2.5">
        {simple ? <Field label={type === 'skill' ? (zh ? '技能清单' : 'Skills list') : (zh ? '章节内容' : 'Section text')}
          value={section.content} multiline lang={lang} onChange={content => updateSection(sectionIndex, current => ({ ...current, content }))} />
          : section.content ? <Field label={zh ? '章节介绍' : 'Section introduction'} value={section.content} multiline lang={lang}
            onChange={content => updateSection(sectionIndex, current => ({ ...current, content }))} /> : null}
        {section.entries.map((entry, entryIndex) => <div key={entry.id} className="space-y-2">{undoNotices(sectionId, entryIndex)}<fieldset data-block-id={entry.id} className={`min-w-0 space-y-2 ${entryIndex > 0 ? 'border-t border-[var(--app-border)] pt-2.5' : 'pt-0.5'}`}>
          <legend className="sr-only">{section.title} {entryIndex + 1}</legend>
          <div className="flex items-center gap-0.5 rounded-[var(--ui-radius-control)] p-0.5 transition-colors hover:bg-[var(--ui-hover-bg)]">
            <button type="button" className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 px-1 text-left text-xs font-semibold text-[var(--foreground)] sm:text-[13px]" aria-expanded={!collapsed.has(entry.id!)} aria-controls={`${entry.id}-body`} onClick={() => toggle(entry.id!)}>
              {collapsed.has(entry.id!) ? <ChevronRight size={13} aria-hidden="true" className="shrink-0 text-muted-foreground" /> : <ChevronDown size={13} aria-hidden="true" className="shrink-0 text-muted-foreground" />}<span className="truncate">{getEntrySummary(entry, simple ? (zh ? '新分组' : 'New group') : (zh ? '新经历' : 'New entry'))}</span>
            </button>
            <div className="hidden shrink-0 items-center gap-0.5 text-muted-foreground sm:flex">
              {[-1, 1].map(offset => <button key={offset} type="button" className={actionClass} disabled={offset < 0 ? entryIndex === 0 : entryIndex === section.entries.length - 1}
                aria-label={zh ? `${offset < 0 ? '上移' : '下移'}${section.title}第${entryIndex + 1}条` : `Move ${section.title} entry ${entryIndex + 1} ${offset < 0 ? 'up' : 'down'}`}
                onClick={() => updateSection(sectionIndex, current => { const entries = [...current.entries]; const target = entryIndex + offset; [entries[entryIndex], entries[target]] = [entries[target], entries[entryIndex]]; return { ...current, entries }; })}>
                {offset < 0 ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
              </button>)}
              <button type="button" className={`${actionClass} ui-destructive-subtle`} aria-label={zh ? `删除${section.title}第${entryIndex + 1}条` : `Delete ${section.title} entry ${entryIndex + 1}`}
                title={zh ? '删除经历' : 'Delete entry'} onClick={() => remove(sectionIndex, entryIndex)}><Trash2 size={14} aria-hidden="true" /></button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger aria-label={zh ? `更多经历操作：${section.title}第${entryIndex + 1}条` : `More entry actions: ${section.title} ${entryIndex + 1}`}
                className="app-control inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-[var(--ui-radius-control)] text-muted-foreground sm:hidden">
                <MoreHorizontal size={16} aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={entryIndex === 0} onClick={() => updateSection(sectionIndex, current => { const entries = [...current.entries]; [entries[entryIndex], entries[entryIndex - 1]] = [entries[entryIndex - 1], entries[entryIndex]]; return { ...current, entries }; })}><ArrowUp size={14} aria-hidden="true" />{zh ? '上移经历' : 'Move entry up'}</DropdownMenuItem>
                <DropdownMenuItem disabled={entryIndex === section.entries.length - 1} onClick={() => updateSection(sectionIndex, current => { const entries = [...current.entries]; [entries[entryIndex], entries[entryIndex + 1]] = [entries[entryIndex + 1], entries[entryIndex]]; return { ...current, entries }; })}><ArrowDown size={14} aria-hidden="true" />{zh ? '下移经历' : 'Move entry down'}</DropdownMenuItem>
                <DropdownMenuItem data-variant="destructive" onClick={() => remove(sectionIndex, entryIndex)}><Trash2 size={14} aria-hidden="true" />{zh ? '删除经历' : 'Delete entry'}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div id={`${entry.id}-body`} hidden={collapsed.has(entry.id!)} className="space-y-2.5 pb-1 ps-4">
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <Field label={headingLabel} value={entry.heading} onChange={heading => updateEntry(sectionIndex, entryIndex, { heading })} />
            {(!simple || entry.organization) && <Field label={orgLabel} value={entry.organization} onChange={organization => updateEntry(sectionIndex, entryIndex, { organization })} />}
          </div>
          {(!simple || entry.meta) && <ResumeDateField label={t.entryMeta} value={entry.meta} lang={lang} onChange={meta => updateEntry(sectionIndex, entryIndex, { meta })} />}
          <Field label={simple ? (zh ? '分组内容' : 'Group content') : contentLabel} value={entry.content} multiline lang={lang}
            onChange={content => updateEntry(sectionIndex, entryIndex, { content })} />
          </div>
        </fieldset></div>)}
        {undoNotices(sectionId, section.entries.length, true)}
        {!simple && <button type="button" className="app-control inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[var(--ui-radius-control)] border border-dashed border-[var(--app-border)] px-3 text-xs text-muted-foreground transition-colors hover:border-[var(--ui-focus)] hover:bg-[var(--ui-hover-bg)] hover:text-[var(--secondary-foreground)]"
          onClick={() => { const id = crypto.randomUUID(); updateSection(sectionIndex, current => ({ ...current, type, entries: [...current.entries, { id, heading: '', meta: '', organization: '', content: '' }] })); reveal(id, sectionId); }}>
          <Plus size={14} aria-hidden="true" />{addLabel}
        </button>}
        </div>
      </section></div>;
    })}
    {undoNotices(undefined, state.sections.length, true)}
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer py-2">{zh ? '填写提示' : 'Editing tips'}</summary>
      <p className="leading-relaxed">{bodyHint} {zh ? '修改自动保存，改错可用上方“撤销”。' : 'Changes save automatically. Use Undo above to restore edits.'}</p>
    </details>
  </div>;
});
