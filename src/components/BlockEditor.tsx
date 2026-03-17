import { Minus, Plus } from 'lucide-react';

import type { AppLanguage, TranslationSet } from '../config/ui';
import type { ResumeDraft, ResumeEntry, ResumeSection } from '../types/resume';

interface BlockEditorProps {
  draft: ResumeDraft;
  lang: AppLanguage;
  translations: TranslationSet;
  onChange: (draft: ResumeDraft) => void;
}

function updateSection(sections: ResumeSection[], sectionIndex: number, updater: (section: ResumeSection) => ResumeSection) {
  return sections.map((section, index) => (index === sectionIndex ? updater(section) : section));
}

function updateEntry(entries: ResumeEntry[], entryIndex: number, updater: (entry: ResumeEntry) => ResumeEntry) {
  return entries.map((entry, index) => (index === entryIndex ? updater(entry) : entry));
}

type SectionType = 'experience' | 'education' | 'project' | 'skill' | 'custom';

function inferSectionType(title: string): SectionType {
  const lowerTitle = title.toLowerCase();
  if (/工作|经历|work|experience/i.test(lowerTitle)) return 'experience';
  if (/教育|学历|education/i.test(lowerTitle)) return 'education';
  if (/项目|project/i.test(lowerTitle)) return 'project';
  if (/技能|能力|skill/i.test(lowerTitle)) return 'skill';
  return 'custom';
}

function getFieldLabel(sectionTitle: string, field: 'heading' | 'meta' | 'org', t: TranslationSet): string {
  const type = inferSectionType(sectionTitle);
  if (field === 'heading') {
    if (type === 'experience') return t.entryHeading;
    if (type === 'education') return '学校 / 专业';
    if (type === 'project') return '项目名称';
  }
  if (field === 'org') {
    if (type === 'experience') return t.entryOrganization;
    if (type === 'education') return '学位 / 证书';
  }
  return field === 'heading' ? t.entryHeading : field === 'meta' ? t.entryMeta : t.entryOrganization;
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

export function BlockEditor({ draft, lang, translations: t, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-5 sm:space-y-6 text-sm text-gray-700 dark:text-gray-300">
      <section className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldName}</span>
          <input
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            value={draft.frontmatter.name}
            onChange={(event) =>
              onChange({
                ...draft,
                frontmatter: {
                  ...draft.frontmatter,
                  name: event.target.value,
                },
              })
            }
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldTitle}</span>
          <input
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            value={draft.frontmatter.title}
            onChange={(event) =>
              onChange({
                ...draft,
                frontmatter: {
                  ...draft.frontmatter,
                  title: event.target.value,
                },
              })
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldContact}</span>
          <input
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            value={draft.frontmatter.contact}
            onChange={(event) =>
              onChange({
                ...draft,
                frontmatter: {
                  ...draft.frontmatter,
                  contact: event.target.value,
                },
              })
            }
          />
        </label>
      </section>

      <section>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.fieldSummary}</span>
          <textarea
            className="w-full min-h-24 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 px-3 sm:px-4 py-3 sm:py-4 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors resize-none"
            value={draft.summary}
            onChange={(event) => onChange({ ...draft, summary: event.target.value })}
          />
        </label>
      </section>

      {draft.sections.map((section, sectionIndex) => {
        const sectionType = inferSectionType(section.title);
        const config = getSectionFieldConfig(sectionType, lang, t);

        return (
          <section key={`${section.title}-${sectionIndex}`} className="rounded-[22px] sm:rounded-[28px] border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-800/40 backdrop-blur-sm p-4 sm:p-5 space-y-4 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <label className="block flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">{t.sectionTitle}</span>
                <input
                  className="w-full rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  value={section.title}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      sections: updateSection(draft.sections, sectionIndex, (current) => ({
                        ...current,
                        title: event.target.value,
                      })),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="shrink-0 mt-6 p-1.5 sm:p-2 rounded-full border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                title={t.deleteSection}
                onClick={() =>
                  onChange({
                    ...draft,
                    sections: draft.sections.filter((_, index) => index !== sectionIndex),
                  })
                }
              >
                <Minus size={14} />
              </button>
            </div>

            {section.entries.map((entry, entryIndex) => (
              <div key={`${entry.heading}-${entryIndex}`} className="rounded-xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 bg-[#faf8f5] dark:bg-gray-900/50 p-3 sm:p-4 space-y-3 transition-colors">
                
                {(config.showHeading || config.showMeta) && (
                  <div className={`grid gap-2 sm:gap-3 ${config.showHeading && config.showMeta ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {config.showHeading && (
                      <label className="block text-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{config.headingLabel}</span>
                        <input
                          className="w-full rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                          value={entry.heading}
                          onChange={(event) =>
                            onChange({
                              ...draft,
                              sections: updateSection(draft.sections, sectionIndex, (current) => ({
                                ...current,
                                entries: updateEntry(current.entries, entryIndex, (currentEntry) => ({
                                  ...currentEntry,
                                  heading: event.target.value,
                                })),
                              })),
                            })
                          }
                        />
                      </label>
                    )}
                    
                    {config.showMeta && (
                      <label className="block text-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{t.entryMeta}</span>
                        <input
                          className="w-full rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                          value={entry.meta}
                          onChange={(event) =>
                            onChange({
                              ...draft,
                              sections: updateSection(draft.sections, sectionIndex, (current) => ({
                                ...current,
                                entries: updateEntry(current.entries, entryIndex, (currentEntry) => ({
                                  ...currentEntry,
                                  meta: event.target.value,
                                })),
                              })),
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                )}

                {config.showOrg && (
                  <label className="block text-xs">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{config.orgLabel}</span>
                    <input
                      className="w-full rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                      value={entry.organization}
                      onChange={(event) =>
                        onChange({
                          ...draft,
                          sections: updateSection(draft.sections, sectionIndex, (current) => ({
                            ...current,
                            entries: updateEntry(current.entries, entryIndex, (currentEntry) => ({
                              ...currentEntry,
                              organization: event.target.value,
                            })),
                          })),
                        })
                      }
                    />
                  </label>
                )}

                <label className="block text-xs">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-1.5">{t.entryContent}</span>
                  <textarea
                    className={`${config.showHeading ? 'min-h-20 sm:min-h-24' : 'min-h-[120px] sm:min-h-[160px]'} w-full rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors resize-none`}
                    value={entry.content}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        sections: updateSection(draft.sections, sectionIndex, (current) => ({
                          ...current,
                          entries: updateEntry(current.entries, entryIndex, (currentEntry) => ({
                            ...currentEntry,
                            content: event.target.value,
                          })),
                        })),
                      })
                    }
                  />
                </label>

                <button
                  type="button"
                  className="p-1.5 sm:p-2 w-full rounded-lg sm:rounded-2xl border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center"
                  title={t.deleteEntry}
                  onClick={() =>
                    onChange({
                      ...draft,
                      sections: updateSection(draft.sections, sectionIndex, (current) => ({
                        ...current,
                        entries: current.entries.filter((_, index) => index !== entryIndex),
                      })),
                    })
                  }
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center"
              title={t.addEntry}
              onClick={() =>
                onChange({
                  ...draft,
                  sections: updateSection(draft.sections, sectionIndex, (current) => ({
                    ...current,
                    entries: [
                      ...current.entries,
                      {
                        heading: '',
                        meta: '',
                        organization: '',
                        content: t.newEntryContent,
                      },
                    ],
                  })),
                })
              }
            >
              <Plus size={20} />
            </button>
          </section>
        );
      })}

      <button
        type="button"
        className="w-full py-3 sm:py-4 rounded-[22px] sm:rounded-[28px] border border-dashed border-gray-400 dark:border-gray-700 text-gray-500 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center"
        title={t.addSection}
        onClick={() =>
          onChange({
            ...draft,
            sections: [
              ...draft.sections,
              {
                title: t.newSection,
                content: '',
                entries: [],
              },
            ],
          })
        }
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
