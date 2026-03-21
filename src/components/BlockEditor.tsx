import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { startTransition } from 'react';
import { Minus, Plus } from 'lucide-react';

import type { AppLanguage, TranslationSet } from '@/config/ui';
import type { ResumeDraft, ResumeSection } from '@/types/resume';

interface BlockEditorProps {
  draft: ResumeDraft;
  lang: AppLanguage;
  translations: TranslationSet;
  onChange: (draft: ResumeDraft) => void;
}

type SectionType = 'experience' | 'education' | 'project' | 'skill' | 'custom';

function inferSectionType(title: string): SectionType {
  const lower = title.toLowerCase();
  if (/工作|经历|work|experience/i.test(lower)) return 'experience';
  if (/教育|学历|education/i.test(lower)) return 'education';
  if (/项目|project/i.test(lower)) return 'project';
  if (/技能|能力|skill/i.test(lower)) return 'skill';
  return 'custom';
}

function getSectionFieldConfig(type: SectionType, lang: AppLanguage, t: TranslationSet) {
  switch (type) {
    case 'experience':
      return { showHeading: true, showMeta: true, showOrg: true, headingLabel: t.entryHeading, orgLabel: t.entryOrganization };
    case 'education':
      return { showHeading: true, showMeta: true, showOrg: true, headingLabel: lang === 'zh' ? '学校/专业' : 'School/Major', orgLabel: lang === 'zh' ? '学历' : 'Degree' };
    case 'project':
      return { showHeading: true, showMeta: true, showOrg: false, headingLabel: lang === 'zh' ? '项目名称' : 'Project Name', orgLabel: t.entryOrganization };
    case 'skill':
      return { showHeading: false, showMeta: false, showOrg: false, headingLabel: t.entryHeading, orgLabel: t.entryOrganization };
    default:
      return { showHeading: true, showMeta: true, showOrg: true, headingLabel: t.entryHeading, orgLabel: t.entryOrganization };
  }
}

export const BlockEditor = memo(function BlockEditor({ draft, lang, translations: t, onChange }: BlockEditorProps) {
  const [state, setState] = useState(draft);
  const stateRef = useRef(draft);

  useEffect(() => {
    setState(draft);
    stateRef.current = draft;
  }, [draft]);

  const update = useCallback((updater: (prev: ResumeDraft) => ResumeDraft) => {
    let next: ResumeDraft | undefined;
    setState(prev => {
      next = updater(prev);
      stateRef.current = next;
      return next;
    });
    if (next) {
      startTransition(() => onChange(next!));
    }
  }, [onChange]);

  return (
    <div className="space-y-5 sm:space-y-6 text-sm text-gray-700 dark:text-gray-300 px-4 sm:px-8 py-5 sm:py-6">
      <section className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldName}</span>
          <input
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            value={state.frontmatter.name}
            onChange={(e) => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, name: e.target.value } }))}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldTitle}</span>
          <input
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            value={state.frontmatter.title}
            onChange={(e) => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, title: e.target.value } }))}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldContact}</span>
          <input
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            value={state.frontmatter.contact}
            onChange={(e) => update(prev => ({ ...prev, frontmatter: { ...prev.frontmatter, contact: e.target.value } }))}
          />
        </label>
      </section>

      <section>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldSummary}</span>
          <textarea
            className="w-full min-h-24 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-3 sm:py-4 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors resize-none"
            value={state.summary}
            onChange={(e) => update(prev => ({ ...prev, summary: e.target.value }))}
          />
        </label>
      </section>

      {state.sections.map((section, sectionIndex) => {
        const sectionType = inferSectionType(section.title);
        const config = getSectionFieldConfig(sectionType, lang, t);

        return (
          <section key={`${section.title}-${sectionIndex}`} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm p-4 sm:p-5 space-y-4 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <label className="block flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.sectionTitle}</span>
                <input
                  className="w-full rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  value={section.title}
                  onChange={(e) => update(prev => ({
                    ...prev,
                    sections: prev.sections.map((s, i) => i === sectionIndex ? { ...s, title: e.target.value } : s)
                  }))}
                />
              </label>
              <button
                type="button"
                className="shrink-0 mt-6 p-1.5 sm:p-2 rounded-lg border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                title={t.deleteSection}
                onClick={() => update(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== sectionIndex) }))}
              >
                <Minus size={14} />
              </button>
            </div>

            {section.entries.map((entry, entryIndex) => (
              <div key={`${entry.heading}-${entryIndex}`} className="rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 bg-[#faf8f5] dark:bg-gray-900/50 p-3 sm:p-4 space-y-3 transition-colors">
                {(config.showHeading || config.showMeta) && (
                  <div className={`grid gap-2 sm:gap-3 ${config.showHeading && config.showMeta ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {config.showHeading && (
                      <label className="block text-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{config.headingLabel}</span>
                        <input
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                          value={entry.heading}
                          onChange={(e) => update(prev => ({
                            ...prev,
                            sections: prev.sections.map((s, si) => si === sectionIndex ? {
                              ...s, entries: s.entries.map((en, ei) => ei === entryIndex ? { ...en, heading: e.target.value } : en)
                            } : s)
                          }))}
                        />
                      </label>
                    )}
                    {config.showMeta && (
                      <label className="block text-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{t.entryMeta}</span>
                        <input
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                          value={entry.meta}
                          onChange={(e) => update(prev => ({
                            ...prev,
                            sections: prev.sections.map((s, si) => si === sectionIndex ? {
                              ...s, entries: s.entries.map((en, ei) => ei === entryIndex ? { ...en, meta: e.target.value } : en)
                            } : s)
                          }))}
                        />
                      </label>
                    )}
                  </div>
                )}

                {config.showOrg && (
                  <label className="block text-xs">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{config.orgLabel}</span>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                      value={entry.organization}
                      onChange={(e) => update(prev => ({
                        ...prev,
                        sections: prev.sections.map((s, si) => si === sectionIndex ? {
                          ...s, entries: s.entries.map((en, ei) => ei === entryIndex ? { ...en, organization: e.target.value } : en)
                        } : s)
                      }))}
                    />
                  </label>
                )}

                <label className="block text-xs">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{t.entryContent}</span>
                  <textarea
                    className={`${config.showHeading ? 'min-h-20 sm:min-h-24' : 'min-h-[120px] sm:min-h-[160px]'} w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors resize-none`}
                    value={entry.content}
                    onChange={(e) => update(prev => ({
                      ...prev,
                      sections: prev.sections.map((s, si) => si === sectionIndex ? {
                        ...s, entries: s.entries.map((en, ei) => ei === entryIndex ? { ...en, content: e.target.value } : en)
                      } : s)
                    }))}
                  />
                </label>

                <button
                  type="button"
                  className="p-1.5 sm:p-2 w-full rounded-lg border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                  title={t.deleteEntry}
                  onClick={() => update(prev => ({
                    ...prev,
                    sections: prev.sections.map((s, si) => si === sectionIndex
                      ? { ...s, entries: s.entries.filter((_, ei) => ei !== entryIndex) }
                      : s)
                  }))}
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center"
              title={t.addEntry}
              onClick={() => update(prev => ({
                ...prev,
                sections: prev.sections.map((s, i) => i === sectionIndex ? {
                  ...s, entries: [...s.entries, { heading: '', meta: '', organization: '', content: t.newEntryContent }]
                } : s)
              }))}
            >
              <Plus size={20} />
            </button>
          </section>
        );
      })}

      <button
        type="button"
        className="w-full py-3 sm:py-4 rounded-xl border border-dashed border-gray-400 dark:border-gray-700 text-gray-500 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center"
        title={t.addSection}
        onClick={() => update(prev => ({
          ...prev,
          sections: [...prev.sections, { title: t.newSection, content: '', entries: [] }]
        }))}
      >
        <Plus size={24} />
      </button>
    </div>
  );
});
