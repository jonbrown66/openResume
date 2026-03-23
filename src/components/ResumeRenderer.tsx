import { memo, useMemo, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { User } from 'lucide-react';

import type { ResumeDraft, ResumeEntry, ResumeSection } from '../types/resume';
import { parseMarkdownToResumeDraft } from '../utils/resumeDocument';
import type { ResumeThemeConfig } from '../types/theme';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  className?: string;
}

const Avatar = memo(({ src, alt = 'Profile', size = 'md', shape = 'circle', className = '' }: AvatarProps) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  };
  
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
  };
  
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizeClasses[size]} ${shapeClass} object-cover ${className}`}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} ${shapeClass} bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}>
      <User size={iconSizes[size]} className="text-gray-400 dark:text-gray-500" />
    </div>
  );
});
Avatar.displayName = 'Avatar';

interface ResumeRendererProps {
  markdown?: string;
  draft?: ResumeDraft;
  template?: string;
  theme: ResumeThemeConfig;
}

const CustomCssInjector = memo(({ css, id }: { css: string; id: string }) => {
  if (!css) return null;
  const protectedStyles = `
    .template-classic h1, .template-minimal h1, .template-standard h1,
    .template-classic h2, .template-minimal h2, .template-standard h2,
    .template-sidebar h1, .template-sidebar h2 {
      color: inherit !important;
    }
  `;
  return (
    <>
      <style id={id} dangerouslySetInnerHTML={{ __html: protectedStyles }} />
      <style id={`${id}-custom`} dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
});
CustomCssInjector.displayName = 'CustomCssInjector';

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

const MarkdownRenderer = memo(({ content, isSkills = false }: { content: string; isSkills?: boolean }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      h3: ({ children, ...props }) => {
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
      ul: ({ children, ...props }) => (
        <ul className={isSkills ? 'skills-list' : 'resume-list'} {...props}>
          {children}
        </ul>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
));
MarkdownRenderer.displayName = 'MarkdownRenderer';

const EntryItem = memo(({ entry }: { entry: ResumeEntry }) => (
  <div>
    <div className="resume-h3-split">
      <h3>{entry.heading}</h3>
      {entry.meta && <span>{entry.meta}</span>}
    </div>
    {entry.organization && <p><strong>{entry.organization}</strong></p>}
    {entry.content && <MarkdownRenderer content={entry.content} />}
  </div>
));
EntryItem.displayName = 'EntryItem';

const SectionItem = memo(({ section, index }: { section: ResumeSection; index: number }) => {
  const skills = isSkillsSection(section.title);
  return (
    <div key={`${section.title}-${index}`}>
      <h2>{section.title}</h2>
      {section.content && <MarkdownRenderer content={section.content} isSkills={skills} />}
      {section.entries.map((entry, entryIndex) => (
        <EntryItem key={`${section.title}-${entryIndex}`} entry={entry} />
      ))}
    </div>
  );
});
SectionItem.displayName = 'SectionItem';

const HeaderClassic = memo(({ frontmatter }: { frontmatter: ResumeDraft['frontmatter'] }) => (
  <div className="bg-[#EAEAEA] p-6 flex mb-4 shrink-0">
    <div className="w-1/2 flex flex-col justify-center">
      <h1 className="text-[2.5rem] font-black text-[var(--primary-color)] tracking-widest uppercase leading-none mb-2">
        {(frontmatter.name || 'NAME').split(' ').map((word) => (
          <span key={word} className="block">{word}</span>
        ))}
      </h1>
      <h2 className="text-xl text-[var(--secondary-color)] mt-2 font-medium">
        {frontmatter.title || 'Title'}
      </h2>
      <p className="text-xs text-[#6b7280] mt-4 tracking-wider font-medium">
        {frontmatter.contact || 'Contact Info'}
      </p>
    </div>
    <div className="w-1/2 flex justify-end items-center pr-2">
      <Avatar src={frontmatter.image} size="xl" shape="square" />
    </div>
  </div>
));
HeaderClassic.displayName = 'HeaderClassic';

const HeaderStandard = memo(({ frontmatter }: { frontmatter: ResumeDraft['frontmatter'] }) => (
  <div className="mb-4 shrink-0 border-b-2 border-[var(--primary-color)] pb-4">
    <div className="flex">
      <div className="w-1/2 flex flex-col justify-center">
        <h1 className="text-3xl font-bold text-[var(--primary-color)] uppercase tracking-tight mb-1">
          {frontmatter.name || 'NAME'}
        </h1>
        <h2 className="text-lg font-bold text-[var(--secondary-color)] uppercase">
          {frontmatter.title || 'Title'}
        </h2>
        <p className="text-sm text-[#4b5563] mt-2">
          {frontmatter.contact?.split('|').map((item) => item.trim()).join('  ·  ') || 'Contact Info'}
        </p>
      </div>
      <div className="w-1/2 flex justify-end items-center pr-2">
        <Avatar src={frontmatter.image} size="lg" shape="circle" />
      </div>
    </div>
  </div>
));
HeaderStandard.displayName = 'HeaderStandard';

const HeaderMinimal = memo(({ frontmatter }: { frontmatter: ResumeDraft['frontmatter'] }) => (
  <div className="pb-5 flex flex-col items-center text-center border-b border-[#d1d5db] mb-4 shrink-0">
    <Avatar src={frontmatter.image} size="md" shape="circle" className="mb-4" />
    <h1 className="text-3xl font-serif font-bold text-[var(--primary-color)] uppercase tracking-widest mb-2">
      {frontmatter.name || 'NAME'}
    </h1>
    <h2 className="text-base text-[#4b5563] tracking-widest uppercase mb-3">
      {frontmatter.title || 'Title'}
    </h2>
    <p className="text-xs text-[#6b7280] tracking-widest">
      {frontmatter.contact || 'Contact Info'}
    </p>
  </div>
));
HeaderMinimal.displayName = 'HeaderMinimal';

function renderHeader(draft: ResumeDraft, template: string) {
  if (template === 'standard') return <HeaderStandard frontmatter={draft.frontmatter} />;
  if (template === 'minimal') return <HeaderMinimal frontmatter={draft.frontmatter} />;
  return <HeaderClassic frontmatter={draft.frontmatter} />;
}

const SidebarTemplate = memo(({ draft, style }: { draft: ResumeDraft; style: React.CSSProperties }) => (
  <div style={style} className={`template-sidebar h-full p-[var(--page-margin)] flex flex-col box-border bg-[#FDFBF7]`}>
    <div className="text-center mb-6 flex flex-col items-center shrink-0">
      <Avatar src={draft.frontmatter.image} size="md" shape="circle" className="mb-4" />
      <h1 className="text-4xl font-bold text-[var(--primary-color)] uppercase tracking-widest mb-2">
        {draft.frontmatter.name || 'NAME'}
      </h1>
      <h2 className="text-lg text-[var(--secondary-color)] mb-3 uppercase tracking-widest">
        {draft.frontmatter.title || 'Title'}
      </h2>
      <p className="text-xs text-[#6b7280]">
        {draft.frontmatter.contact?.split('|').map((item) => item.trim()).join('  |  ') || 'Contact Info'}
      </p>
    </div>
    <div className="resume-content flex-1">
      {draft.summary && (
        <div className="sidebar-section">
          <div className="sidebar-title">
            <h2>{getSummaryTitle(draft)}</h2>
          </div>
          <div className="sidebar-content">
            <MarkdownRenderer content={draft.summary} />
          </div>
        </div>
      )}
      {draft.sections.map((section, index) => (
        <div key={`${section.title}-${index}`} className="sidebar-section">
          <div className="sidebar-title">
            <h2>{section.title}</h2>
          </div>
          <div className="sidebar-content">
            {section.content && <MarkdownRenderer content={section.content} isSkills={isSkillsSection(section.title)} />}
            {section.entries.map((entry, entryIndex) => (
              <EntryItem key={`${section.title}-${entryIndex}`} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
));
SidebarTemplate.displayName = 'SidebarTemplate';

export const ResumeRenderer = memo(({ markdown, draft, template = 'classic', theme }: ResumeRendererProps) => {
  const resumeDraft = useMemo(
    () => draft ?? parseMarkdownToResumeDraft(markdown ?? ''),
    [draft, markdown]
  );
  
  const style = useMemo(() => ({
    '--primary-color': theme.primaryColor,
    '--secondary-color': theme.secondaryColor,
    '--font-family': theme.fontFamily,
    '--font-size': `${theme.fontSize}pt`,
    '--line-height': theme.lineHeight,
    '--section-spacing': `${theme.sectionSpacing}px`,
    '--page-margin': `${theme.pageMargin}mm`,
  } as React.CSSProperties), [theme]);

  const customCssId = useId();

  if (template === 'sidebar') {
    return (
      <>
        <CustomCssInjector css={theme.customCss} id={customCssId} />
        <SidebarTemplate draft={resumeDraft} style={style} />
      </>
    );
  }

  return (
    <div style={style} className={`template-${template} h-full p-[var(--page-margin)] flex flex-col box-border bg-white`}>
      <CustomCssInjector css={theme.customCss} id={customCssId} />
      {renderHeader(resumeDraft, template)}
      <div className="resume-content text-[var(--font-size)] text-[#374151] leading-[var(--line-height)] flex-1">
        {resumeDraft.summary && (
          <div>
            <h2>{getSummaryTitle(resumeDraft)}</h2>
            <MarkdownRenderer content={resumeDraft.summary} />
          </div>
        )}
        {resumeDraft.sections.map((section, index) => (
          <SectionItem key={`${section.title}-${index}`} section={section} index={index} />
        ))}
      </div>
    </div>
  );
});
ResumeRenderer.displayName = 'ResumeRenderer';
