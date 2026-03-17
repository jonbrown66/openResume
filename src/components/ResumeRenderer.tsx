import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import type { ResumeDraft, ResumeEntry, ResumeSection } from '../types/resume';
import { parseMarkdownToResumeDraft } from '../utils/resumeDocument';

interface ResumeRendererProps {
  markdown?: string;
  draft?: ResumeDraft;
  template?: string;
}

function isChineseText(value: string): boolean {
  return /[\u4e00-\u9fa5]/.test(value);
}

function getSummaryTitle(draft: ResumeDraft): string {
  if (isChineseText(`${draft.frontmatter.name} ${draft.summary}`)) {
    return '个人简介';
  }

  return 'PROFESSIONAL SUMMARY';
}

function isSkillsSection(title: string): boolean {
  return /skill|技能|能力/i.test(title);
}

function renderMarkdown(md: string, isSkills = false) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h3: ({ node: _node, children, ...props }) => {
          const text = String(children);
          if (text.includes('|')) {
            const [left, right] = text.split('|');
            return (
              <div className="resume-h3-split">
                <h3 {...props}>{left.trim()}</h3>
                <span>{right.trim()}</span>
              </div>
            );
          }

          return <h3 {...props}>{children}</h3>;
        },
        ul: ({ node: _node, children, ...props }) => (
          <ul className={isSkills ? 'skills-list' : 'resume-list'} {...props}>
            {children}
          </ul>
        ),
      }}
    >
      {md}
    </ReactMarkdown>
  );
}

function renderEntry(entry: ResumeEntry, key: string) {
  return (
    <div key={key}>
      <div className="resume-h3-split">
        <h3>{entry.heading}</h3>
        {entry.meta ? <span>{entry.meta}</span> : null}
      </div>
      {entry.organization ? <p><strong>{entry.organization}</strong></p> : null}
      {entry.content ? renderMarkdown(entry.content) : null}
    </div>
  );
}

function renderSection(section: ResumeSection, index: number) {
  const skills = isSkillsSection(section.title);

  return (
    <div key={`${section.title}-${index}`}>
      <h2>{section.title}</h2>
      {section.content ? renderMarkdown(section.content, skills) : null}
      {section.entries.map((entry, entryIndex) => renderEntry(entry, `${section.title}-${entryIndex}`))}
    </div>
  );
}

function renderHeader(draft: ResumeDraft, template: string) {
  const { frontmatter } = draft;

  if (template === 'standard') {
    return (
      <div className="mb-6 shrink-0">
        <div className="flex justify-between items-end border-b-2 border-[#d1d5db] pb-4 mb-4">
          <h1 className="text-4xl font-bold text-[#111827] uppercase tracking-tight">
            {frontmatter.name || 'NAME'}
          </h1>
          <h2 className="text-lg font-bold text-[#1f2937] uppercase">
            {frontmatter.title || 'Title'}
          </h2>
        </div>
        <p className="text-sm text-[#4b5563] text-center">
          {frontmatter.contact?.split('|').map((item) => item.trim()).join('  ·  ') || 'Contact Info'}
        </p>
      </div>
    );
  }

  if (template === 'minimal') {
    return (
      <div className="pb-6 flex flex-col items-center text-center border-b border-[#d1d5db] mb-6 shrink-0">
        {frontmatter.image ? (
          <img
            src={frontmatter.image}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover mb-4"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        ) : null}
        <h1 className="text-3xl font-serif font-bold text-[#111827] uppercase tracking-widest mb-2">
          {frontmatter.name || 'NAME'}
        </h1>
        <h2 className="text-base text-[#4b5563] tracking-widest uppercase mb-3">
          {frontmatter.title || 'Title'}
        </h2>
        <p className="text-xs text-[#6b7280] tracking-widest">
          {frontmatter.contact || 'Contact Info'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#EAEAEA] p-8 flex items-center gap-8 mb-8 shrink-0">
      {frontmatter.image ? (
        <img
          src={frontmatter.image}
          alt="Profile"
          className="w-36 h-36 object-cover"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
      ) : null}
      <div className="flex-1">
        <h1 className="text-[2.5rem] font-black text-[#1f2937] tracking-widest uppercase leading-none mb-2">
          {(frontmatter.name || 'NAME').split(' ').map((word) => (
            <span key={word} className="block">{word}</span>
          ))}
        </h1>
        <h2 className="text-xl text-[#374151] mt-2 font-medium">
          {frontmatter.title || 'Title'}
        </h2>
        <p className="text-xs text-[#6b7280] mt-4 tracking-wider font-medium">
          {frontmatter.contact || 'Contact Info'}
        </p>
      </div>
    </div>
  );
}

export function ResumeRenderer({ markdown, draft, template = 'classic' }: ResumeRendererProps) {
  const resumeDraft = draft ?? parseMarkdownToResumeDraft(markdown ?? '');

  if (template === 'sidebar') {
    return (
      <div className="font-sans template-sidebar h-full p-[15mm] flex flex-col box-border bg-[#FDFBF7]">
        <div className="text-center mb-10 flex flex-col items-center shrink-0">
          <h1 className="text-4xl font-bold text-[#111827] uppercase tracking-widest mb-2">
            {resumeDraft.frontmatter.name || 'NAME'}
          </h1>
          <h2 className="text-lg text-[#374151] mb-3 uppercase tracking-widest">
            {resumeDraft.frontmatter.title || 'Title'}
          </h2>
          <p className="text-xs text-[#6b7280]">
            {resumeDraft.frontmatter.contact?.split('|').map((item) => item.trim()).join('  |  ') || 'Contact Info'}
          </p>
        </div>
        <div className="resume-content flex-1">
          {resumeDraft.summary ? (
            <div className="sidebar-section">
              <div className="sidebar-title">
                <h2>{getSummaryTitle(resumeDraft)}</h2>
              </div>
              <div className="sidebar-content">
                {renderMarkdown(resumeDraft.summary)}
              </div>
            </div>
          ) : null}
          {resumeDraft.sections.map((section, index) => (
            <div key={`${section.title}-${index}`} className="sidebar-section">
              <div className="sidebar-title">
                <h2>{section.title}</h2>
              </div>
              <div className="sidebar-content">
                {section.content ? renderMarkdown(section.content, isSkillsSection(section.title)) : null}
                {section.entries.map((entry, entryIndex) => renderEntry(entry, `${section.title}-${entryIndex}`))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`font-sans template-${template} h-full p-[15mm] flex flex-col box-border`}>
      {renderHeader(resumeDraft, template)}
      <div className="resume-content text-sm text-[#374151] leading-relaxed flex-1">
        {resumeDraft.summary ? (
          <div>
            <h2>{getSummaryTitle(resumeDraft)}</h2>
            {renderMarkdown(resumeDraft.summary)}
          </div>
        ) : null}
        {resumeDraft.sections.map(renderSection)}
      </div>
    </div>
  );
}
