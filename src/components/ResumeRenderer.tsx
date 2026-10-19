import { memo, useMemo, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { ResumeDraft, ResumeEntry, ResumeSection } from '../types/resume';
import { parseMarkdownToResumeDraft } from '../utils/resumeDocument';
import type { ResumeThemeConfig } from '../types/theme';
import { fontFamily } from '@/lib/resumeFonts';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar = memo(({ src, alt = 'Profile', size = 'md', className = '' }: AvatarProps) => {
  if (!src) return null;

  const sizeClasses = {
    sm: 'w-10',
    md: 'w-16',
    lg: 'w-20',
    xl: 'w-24',
  };

  return (
    <img
      src={src}
      alt={alt}
      width={250}
      height={350}
      className={`${sizeClasses[size]} h-auto aspect-[5/7] shrink-0 rounded-[2px] object-cover ${className}`}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
    />
  );
});
Avatar.displayName = 'Avatar';

interface ResumeRendererProps {
  markdown?: string;
  draft?: ResumeDraft;
  template?: string;
  theme: ResumeThemeConfig;
  inheritColors?: boolean;
}

const CustomCssInjector = memo(({ css, id }: { css: string; id: string }) => {
  if (!css) return null;
  const protectedStyles = `
    .resume-template .resume-header h1 {
      color: var(--resume-ink) !important;
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
  if (draft.summaryTitle) return draft.summaryTitle;
  if (isChineseText(`${draft.frontmatter.name} ${draft.summary}`)) {
    return '个人简介';
  }
  return 'PROFESSIONAL SUMMARY';
}

function isSkillsSection(title: string): boolean {
  return /skill|技能|能力/i.test(title);
}

type MarkdownNode = { value?: string; children?: MarkdownNode[] };

function markdownText(node: MarkdownNode): string {
  return node.value ?? node.children?.map(markdownText).join('') ?? '';
}

const MarkdownRenderer = memo(({ content, isSkills = false }: { content: string; isSkills?: boolean }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw, rehypeSanitize]}
    components={{
      h3: ({ children, ...props }) => {
        const text = String(children);
        if (text.includes('|')) {
          const [left, right] = text.split('|');
          return (
            <div className="resume-h3-split">
              <h3 {...props}>{left.trim()}</h3>
              <span className="resume-entry-meta">{right.trim()}</span>
            </div>
          );
        }
        return <h3 {...props}>{children}</h3>;
      },
      ul: ({ children, node, ...props }) => (
        <ul className={isSkills
          ? `skills-list${node?.children.some(item => {
            const text = markdownText(item).replace(/\s+/g, ' ').trim();
            return text.length > 48 || /[:：]/.test(text);
          }) ? ' skills-list-detailed' : ''}`
          : 'resume-list'} {...props}>
          {children}
        </ul>
      ),
      table: ({ children, ...props }) => (
        <div className="resume-table-wrapper">
          <table {...props}>{children}</table>
        </div>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
));
MarkdownRenderer.displayName = 'MarkdownRenderer';

const EntryItem = memo(({ entry }: { entry: ResumeEntry }) => (
  <div>
    {(entry.heading || entry.organization || entry.meta) && (
      <div className="resume-h3-split">
        <h3>
          {entry.heading}
          {entry.organization && (
            <span className="resume-entry-organization"> / {entry.organization}</span>
          )}
        </h3>
        {entry.meta && <span className="resume-entry-meta">{entry.meta}</span>}
      </div>
    )}
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

const HeaderClassic = memo(({ frontmatter }: { frontmatter: ResumeDraft['frontmatter'] }) => {
  const hasImage = Boolean(frontmatter.image);
  return (
    <div className={`resume-header resume-header-classic ${hasImage ? 'has-avatar' : 'no-avatar'}`}>
      {hasImage && (
        <div className="resume-header-media">
          <Avatar src={frontmatter.image} size="lg" className="resume-avatar" />
        </div>
      )}
      <div className="resume-header-main">
        <h1>{frontmatter.name || 'NAME'}</h1>
        {frontmatter.title && <p className="resume-kicker">{frontmatter.title}</p>}
        {frontmatter.contact && (
          <p className="resume-contact">
            {frontmatter.contact.split('|').map((item) => item.trim()).join('  ·  ')}
          </p>
        )}
      </div>
    </div>
  );
});
HeaderClassic.displayName = 'HeaderClassic';

const HeaderStandard = memo(({ frontmatter }: { frontmatter: ResumeDraft['frontmatter'] }) => {
  const hasImage = Boolean(frontmatter.image);
  return (
    <div className={`resume-header resume-header-standard ${hasImage ? 'has-avatar' : 'no-avatar'}`}>
      <div className="resume-header-main">
        <div className="resume-name-row">
          <h1>{frontmatter.name || 'NAME'}</h1>
          {frontmatter.title && <span className="resume-kicker-badge">{frontmatter.title}</span>}
        </div>
        {frontmatter.contact && (
          <p className="resume-contact">
            {frontmatter.contact.split('|').map((item) => item.trim()).join('  ·  ')}
          </p>
        )}
      </div>
      {hasImage && (
        <Avatar src={frontmatter.image} size="md" className="resume-avatar" />
      )}
    </div>
  );
});
HeaderStandard.displayName = 'HeaderStandard';

const HeaderMinimal = memo(({ frontmatter }: { frontmatter: ResumeDraft['frontmatter'] }) => {
  const hasImage = Boolean(frontmatter.image);
  return (
    <div className={`resume-header resume-header-minimal ${hasImage ? 'has-avatar' : 'no-avatar'}`}>
      {hasImage && (
        <Avatar src={frontmatter.image} size="md" className="resume-avatar" />
      )}
      <div className="resume-header-main">
        <div className={`resume-minimal-title-group${frontmatter.name ? ' has-name' : ''}`}>
          <h1>{frontmatter.name || 'NAME'}</h1>
          {frontmatter.title && <span className="resume-minimal-role">{frontmatter.title}</span>}
        </div>
        {frontmatter.contact && (
          <p className="resume-contact">
            {frontmatter.contact.split('|').map((item) => item.trim()).join('  ·  ')}
          </p>
        )}
      </div>
    </div>
  );
});
HeaderMinimal.displayName = 'HeaderMinimal';

function renderHeader(draft: ResumeDraft, template: string) {
  if (template === 'standard') return <HeaderStandard frontmatter={draft.frontmatter} />;
  if (template === 'minimal') return <HeaderMinimal frontmatter={draft.frontmatter} />;
  return <HeaderClassic frontmatter={draft.frontmatter} />;
}

const SidebarTemplate = memo(({ draft, style, fontFamily }: { draft: ResumeDraft; style: React.CSSProperties; fontFamily?: string }) => {
  const hasImage = Boolean(draft.frontmatter.image);

  const isSidebarCategory = (title: string) =>
    /skill|技能|能力|education|教育|certif|证书|language|语言|award|荣誉/i.test(title);

  const sidebarSections = draft.sections.filter((s) => isSidebarCategory(s.title));
  const mainSections = draft.sections.filter((s) => !isSidebarCategory(s.title));

  const summaryInSidebar = sidebarSections.length === 0 && Boolean(draft.summary);
  const summaryInMain = Boolean(draft.summary) && !summaryInSidebar;

  const contactItems = draft.frontmatter.contact
    ? draft.frontmatter.contact.split('|').map((item) => item.trim()).filter(Boolean)
    : [];

  return (
    <div style={style} lang={isChineseText(JSON.stringify(draft)) ? 'zh-CN' : 'en'} data-font-family={fontFamily} className="template-sidebar resume-template h-full box-border">
      <div className="sidebar-grid h-full min-h-full">
        {/* 左侧独立侧边栏 */}
        <aside className="sidebar-aside p-[var(--page-margin)]">
          {hasImage && (
            <div className="sidebar-avatar-wrapper">
              <Avatar src={draft.frontmatter.image} size="xl" className="resume-avatar" />
            </div>
          )}

          {contactItems.length > 0 && (
            <div className="sidebar-block">
              <h2 className="sidebar-heading">{isChineseText(JSON.stringify(draft)) ? '联系方式' : 'CONTACT'}</h2>
              <div className="sidebar-contact-list">
                {contactItems.map((item, idx) => (
                  <div key={idx} className="sidebar-contact-item">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {summaryInSidebar && (
            <div className="sidebar-block">
              <h2 className="sidebar-heading">{getSummaryTitle(draft)}</h2>
              <div className="sidebar-summary-content">
                <MarkdownRenderer content={draft.summary} />
              </div>
            </div>
          )}

          {sidebarSections.map((section, idx) => (
            <div key={`${section.title}-${idx}`} className="sidebar-block">
              <h2 className="sidebar-heading">{section.title}</h2>
              {section.content && (
                <div className="sidebar-block-content">
                  <MarkdownRenderer content={section.content} isSkills={isSkillsSection(section.title)} />
                </div>
              )}
              {section.entries.map((entry, entryIdx) => (
                <div key={`${section.title}-${entryIdx}`} className="sidebar-entry">
                  <div className="sidebar-entry-heading">{entry.heading}</div>
                  {entry.organization && (
                    <div className="sidebar-entry-org">{entry.organization}</div>
                  )}
                  {entry.meta && (
                    <div className="sidebar-entry-meta">{entry.meta}</div>
                  )}
                  {entry.content && (
                    <div className="sidebar-entry-content">
                      <MarkdownRenderer content={entry.content} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* 右侧主内容区 */}
        <main className="sidebar-main p-[var(--page-margin)]">
          <header className="sidebar-main-header">
            <h1>{draft.frontmatter.name || 'NAME'}</h1>
            {draft.frontmatter.title && (
              <p className="resume-kicker">{draft.frontmatter.title}</p>
            )}
          </header>

          <div className="resume-content flex-1">
            {summaryInMain && (
              <div className="resume-summary-block">
                <h2>{getSummaryTitle(draft)}</h2>
                <MarkdownRenderer content={draft.summary} />
              </div>
            )}
            {mainSections.map((section, index) => (
              <SectionItem key={`${section.title}-${index}`} section={section} index={index} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
});
SidebarTemplate.displayName = 'SidebarTemplate';

export const ResumeRenderer = memo(({ markdown, draft, template = 'classic', theme, inheritColors = false }: ResumeRendererProps) => {
  const resumeDraft = useMemo(
    () => draft ?? parseMarkdownToResumeDraft(markdown ?? ''),
    [draft, markdown]
  );

  const style = useMemo(() => ({
    '--primary-color': inheritColors ? 'var(--resume-theme-accent)' : theme.primaryColor,
    '--secondary-color': inheritColors ? 'var(--resume-theme-secondary)' : theme.secondaryColor,
    '--resume-paper': inheritColors ? 'var(--resume-theme-paper)' : theme.backgroundColor,
    '--resume-ivory': inheritColors ? 'var(--resume-theme-paper)' : theme.backgroundColor,
    '--font-family': fontFamily(theme.fontFamily),
    '--font-size': `${theme.fontSize}pt`,
    '--line-height': theme.lineHeight,
    '--section-spacing': `${theme.sectionSpacing}px`,
    '--page-margin': `${theme.pageMargin}mm`,
  } as React.CSSProperties), [theme, inheritColors]);

  const customCssId = useId();

  if (template === 'sidebar') {
    return (
      <>
        <CustomCssInjector css={theme.customCss} id={customCssId} />
        <SidebarTemplate draft={resumeDraft} style={style} fontFamily={theme.fontFamily} />
      </>
    );
  }

  return (
    <div style={style} lang={isChineseText(JSON.stringify(resumeDraft)) ? 'zh-CN' : 'en'} data-font-family={theme.fontFamily} className={`template-${template} resume-template h-full p-[var(--page-margin)] flex flex-col box-border`}>
      <CustomCssInjector css={theme.customCss} id={customCssId} />
      {renderHeader(resumeDraft, template)}
      <div className="resume-content text-[var(--font-size)] leading-[var(--line-height)] flex-1">
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
