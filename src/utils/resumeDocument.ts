import type { ResumeDraft, ResumeEntry, ResumeFrontmatter, ResumeSection } from '../types/resume';

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseFrontmatter(markdown: string): {
  frontmatter: ResumeFrontmatter;
  body: string;
} {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const frontmatter: ResumeFrontmatter = {
    name: '',
    title: '',
    contact: '',
  };

  if (!match) {
    return { frontmatter, body: markdown.trim() };
  }

  for (const line of match[1].split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'name' || key === 'title' || key === 'contact' || key === 'image') {
      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    body: match[2].trim(),
  };
}

function parseEntry(block: string): ResumeEntry {
  const lines = block.trim().split('\n');
  const rawHeading = lines.shift()?.replace(/^###\s+/, '').trim() ?? '';

  // Use the LAST `|` to split heading and meta, so titles containing `|` are preserved
  const lastPipeIndex = rawHeading.lastIndexOf('|');
  let heading: string;
  let meta: string;

  if (lastPipeIndex > 0) {
    heading = rawHeading.slice(0, lastPipeIndex).trim();
    meta = rawHeading.slice(lastPipeIndex + 1).trim();
  } else {
    heading = rawHeading;
    meta = '';
  }

  // Organization: only the FIRST line after ### if it is bold-wrapped
  let organization = '';
  const contentLines: string[] = [];
  let isFirstLine = true;

  for (const line of lines) {
    if (isFirstLine && !organization && /^\*\*.*\*\*$/.test(line.trim())) {
      organization = line.trim().replace(/^\*\*|\*\*$/g, '').trim();
      isFirstLine = false;
      continue;
    }
    isFirstLine = false;
    contentLines.push(line);
  }

  return {
    heading,
    meta,
    organization,
    content: contentLines.join('\n').trim(),
  };
}

function parseSection(block: string): ResumeSection {
  const lines = block.trim().split('\n');
  const title = lines.shift()?.replace(/^##\s+/, '').trim() ?? '';
  const entryStartIndex = lines.findIndex((line) => /^###\s+/.test(line.trim()));

  if (entryStartIndex === -1) {
    // No explicit ### entries.
    // To ensure this content is editable in the BlockEditor (which only renders entries),
    // wrap the section-level content into a single, untitled entry.
    const rawContent = lines.join('\n').trim();
    return {
      title,
      content: '', // Clear section-level content
      entries: rawContent
        ? [
            {
              heading: '',
              meta: '',
              organization: '',
              content: rawContent,
            },
          ]
        : [],
    };
  }

  const leadingContent = lines.slice(0, entryStartIndex).join('\n').trim();
  const entryBlocks = lines
    .slice(entryStartIndex)
    .join('\n')
    .split(/\n(?=###\s+)/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    title,
    content: leadingContent,
    entries: entryBlocks.map(parseEntry),
  };
}

const SUMMARY_PATTERN = /summary|profile|about|简介|个人简介/i;

export function parseMarkdownToResumeDraft(markdown: string): ResumeDraft {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const blocks = body.split(/(?=^##\s+)/m).map((block) => block.trim()).filter(Boolean);
  const summaryBlocks: string[] = [];
  const sections: ResumeSection[] = [];
  let summaryTitle = '';

  for (const block of blocks) {
    if (/^##\s+/m.test(block)) {
      sections.push(parseSection(block));
      continue;
    }
    summaryBlocks.push(block);
  }

  let summary = '';

  // Check if the first section looks like a summary section
  if (sections[0] && SUMMARY_PATTERN.test(sections[0].title)) {
    const summarySection = sections.shift()!;
    summaryTitle = summarySection.title;
    // Combine section content and any entry content into summary text
    const parts = [summarySection.content];
    for (const entry of summarySection.entries) {
      parts.push(entry.content);
    }
    summary = parts.filter(Boolean).join('\n\n').trim();
  } else if (summaryBlocks.length > 0) {
    summary = summaryBlocks.join('\n\n').trim();
  }

  return {
    frontmatter,
    summary,
    summaryTitle,
    sections,
  };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

function serializeFrontmatter(frontmatter: ResumeFrontmatter): string {
  const lines = ['---'];
  lines.push(`name: ${frontmatter.name}`);
  lines.push(`title: ${frontmatter.title}`);

  if (frontmatter.contact) {
    lines.push(`contact: ${frontmatter.contact}`);
  }

  if (frontmatter.image) {
    lines.push(`image: ${frontmatter.image}`);
  }

  lines.push('---');
  return lines.join('\n');
}

function serializeSection(section: ResumeSection): string {
  const lines = [`## ${section.title}`];

  if (section.content) {
    lines.push('', section.content);
  }

  for (const entry of section.entries) {
    lines.push('');
    lines.push(`### ${entry.heading}${entry.meta ? ` | ${entry.meta}` : ''}`);

    if (entry.organization) {
      lines.push(`**${entry.organization}**`);
    }

    if (entry.content) {
      lines.push(entry.content);
    }
  }

  return lines.join('\n').trim();
}

export function serializeResumeDraftToMarkdown(draft: ResumeDraft): string {
  const parts = [serializeFrontmatter(draft.frontmatter)];

  if (draft.summary) {
    // Preserve the original summary section title, or use a sensible default
    const title = draft.summaryTitle || (/[\u4e00-\u9fa5]/.test(draft.summary) ? '个人简介' : 'PROFESSIONAL SUMMARY');
    parts.push(`## ${title}\n\n${draft.summary}`);
  }

  for (const section of draft.sections) {
    parts.push(serializeSection(section));
  }

  return `${parts.join('\n\n').trim()}\n`;
}
