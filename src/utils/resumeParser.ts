import type { ResumeDraft, ResumeEntry, ResumeFrontmatter, ResumeSection } from '@/types/resume';

type SupportedLanguage = 'zh' | 'en';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d[\d\s\-().]{6,}\d)/g;
const DATE_RANGE_REGEX =
  /((?:19|20)\d{2}(?:[./年-]\d{1,2}(?:[./月-]\d{1,2})?)?(?:\s*[—–-]\s*(?:(?:19|20)\d{2}(?:[./年-]\d{1,2}(?:[./月-]\d{1,2})?)?|至今|现在|Present|Current|current|今))?)/i;
const ADDRESS_HINT_REGEX = /(北京市|上海市|深圳市|广州市|杭州|成都|区|市|Road|Street|Avenue|Location|Address)/i;
const ORGANIZATION_HINT_REGEX = /(公司|科技|通讯|集团|有限|大学|学院|学校|University|College|Institute|Inc\.?|Ltd\.?|LLC)/i;
const ROLE_HINT_REGEX = /(工程师|负责人|主管|经理|专员|助理|实习|本科|专科|硕士|博士|学士|Designer|Engineer|Manager|Lead|Specialist|Assistant|Bachelor|Master|PhD)/i;

const SUMMARY_TITLES = {
  zh: '个人简介',
  en: 'PROFESSIONAL SUMMARY',
} as const;

const OTHER_TITLES = {
  zh: '其他',
  en: 'OTHER',
} as const;

const DEFAULT_NAME = {
  zh: '姓名',
  en: 'Name',
} as const;

const DEFAULT_TITLE = {
  zh: '职位',
  en: 'Title',
} as const;

const SECTION_DEFINITIONS = [
  {
    key: 'summary',
    pattern: /^(个人简介|个人总结|职业概述|职业总结|自我评价|自我介绍|简介|summary|professional summary|profile)$/i,
    title: SUMMARY_TITLES,
  },
  {
    key: 'work',
    pattern: /^(工作经历|工作经验|职业经历|职业经验|实习经历|工作经历项目经历|工作及项目经历|工作与项目经历|工作\/项目经历|experience|work experience|employment)$/i,
    title: { zh: '工作经历', en: 'WORK EXPERIENCE' },
  },
  {
    key: 'education',
    pattern: /^(教育背景|教育经历|学历|学习经历|教育|education|academic background)$/i,
    title: { zh: '教育背景', en: 'EDUCATION' },
  },
  {
    key: 'projects',
    pattern: /^(项目经历|项目经验|项目|项目介绍|项目经验介绍|projects?|portfolio)$/i,
    title: { zh: '项目经历', en: 'PROJECTS' },
  },
  {
    key: 'skills',
    pattern: /^(技能|技能特长|专业技能|职业技能|技术技能|技能清单|技能概览|skills?|technical skills|tech stack)$/i,
    title: { zh: '技能', en: 'SKILLS' },
  },
  {
    key: 'certifications',
    pattern: /^(证书|认证|资格证书|certificates?|certifications?)$/i,
    title: { zh: '证书认证', en: 'CERTIFICATIONS' },
  },
  {
    key: 'languages',
    pattern: /^(语言能力|语言|languages?)$/i,
    title: { zh: '语言能力', en: 'LANGUAGES' },
  },
  {
    key: 'awards',
    pattern: /^(获奖经历|奖项|荣誉|awards?|honors?|achievements?)$/i,
    title: { zh: '奖项荣誉', en: 'AWARDS' },
  },
  {
    key: 'interests',
    pattern: /^(兴趣爱好|个人爱好|兴趣|interests?|hobbies?)$/i,
    title: { zh: '兴趣爱好', en: 'INTERESTS' },
  },
] as const;

function normalizeLine(line: string) {
  return line.replace(/\u00a0/g, ' ').trim();
}

function stripMarkdownDecorators(line: string) {
  return normalizeLine(line)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,3}\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .trim();
}

function stripInlineMarkdown(line: string) {
  return normalizeLine(line)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,3}\s*/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function normalizeHeadingCandidate(line: string) {
  return stripMarkdownDecorators(line)
    .replace(/^[\d一二三四五六七八九十]+[.、．\s]+/, '')
    .replace(/[：:]\s*$/, '')
    .trim();
}

function parseFrontmatter(lines: string[]) {
  if (lines[0] !== '---') {
    return {
      frontmatter: {} as Partial<ResumeFrontmatter>,
      contentLines: lines,
    };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (endIndex === -1) {
    return {
      frontmatter: {} as Partial<ResumeFrontmatter>,
      contentLines: lines,
    };
  }

  const frontmatter: Partial<ResumeFrontmatter> = {};
  for (const line of lines.slice(1, endIndex)) {
    const match = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2].trim();
    if (key === 'name' || key === 'title' || key === 'contact' || key === 'image') {
      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    contentLines: lines.slice(endIndex + 1),
  };
}

function isBulletLine(line: string) {
  return /^[-*•●▪]\s*/.test(normalizeLine(line));
}

function normalizeBullet(line: string) {
  return `- ${normalizeLine(line).replace(/^[-*•●▪]\s*/, '').trim()}`;
}

function isLikelyContactLine(line: string) {
  const trimmed = normalizeLine(line);
  return EMAIL_REGEX.test(trimmed) || Boolean(trimmed.match(PHONE_REGEX)) || ADDRESS_HINT_REGEX.test(trimmed);
}

function isLikelySectionHeading(line: string) {
  const candidate = normalizeHeadingCandidate(line);
  return SECTION_DEFINITIONS.some((definition) => definition.pattern.test(candidate));
}

function getSectionDefinition(line: string) {
  const candidate = normalizeHeadingCandidate(line);
  return SECTION_DEFINITIONS.find((definition) => definition.pattern.test(candidate)) ?? null;
}

function extractEmail(text: string) {
  return text.match(EMAIL_REGEX)?.[0] ?? '';
}

function extractPhone(text: string) {
  const matches = text.match(PHONE_REGEX) ?? [];
  return matches.find((match) => match.replace(/\D/g, '').length >= 7) ?? '';
}

function extractAddress(lines: string[]) {
  return lines.find((line) => ADDRESS_HINT_REGEX.test(line) && !EMAIL_REGEX.test(line)) ?? '';
}

function extractName(lines: string[]) {
  for (const line of lines.slice(0, 6)) {
    const trimmed = stripInlineMarkdown(line);
    if (!trimmed || isLikelyContactLine(trimmed) || isLikelySectionHeading(trimmed)) {
      continue;
    }

    if (trimmed.length <= 24 && /^[a-zA-Z\u4e00-\u9fa5\s·.]+$/.test(trimmed)) {
      return trimmed;
    }
  }

  return '';
}

function extractTitle(lines: string[], name: string) {
  for (const line of lines.slice(0, 8)) {
    const trimmed = stripInlineMarkdown(line);
    if (!trimmed || trimmed === name || isLikelyContactLine(trimmed) || isLikelySectionHeading(trimmed)) {
      continue;
    }

    if (trimmed.length <= 40) {
      return trimmed;
    }
  }

  return '';
}

function buildContact(lines: string[]) {
  const email = extractEmail(lines.join('\n'));
  const phone = extractPhone(lines.join('\n'));
  const address = extractAddress(lines.slice(0, 10));
  return [phone, email, address].filter(Boolean).join(' | ');
}

function getSummary(lines: string[], firstSectionIndex: number) {
  const contentBeforeSections = lines
    .slice(0, firstSectionIndex === -1 ? lines.length : firstSectionIndex)
    .filter((line) => !isLikelyContactLine(line) && !isLikelySectionHeading(line));

  const paragraphs = contentBeforeSections
    .join('\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.find((paragraph) => paragraph.length >= 30) ?? '';
}

function splitSections(lines: string[], lang: SupportedLanguage) {
  const sections: Array<{ title: string; key: string; lines: string[] }> = [];
  let current: { title: string; key: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) {
      if (current) {
        current.lines.push('');
      }
      continue;
    }

    const definition = getSectionDefinition(line);
    if (definition) {
      if (current) {
        sections.push(current);
      }

      current = {
        key: definition.key,
        title: normalizeHeadingCandidate(line) || definition.title[lang],
        lines: [],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

function looksLikeEntryHeading(line: string) {
  const trimmed = stripMarkdownDecorators(line);
  if (!trimmed || isLikelySectionHeading(trimmed) || isBulletLine(trimmed)) {
    return false;
  }

  return trimmed.includes('|') || DATE_RANGE_REGEX.test(trimmed) || trimmed.length <= 40;
}

function buildEntryBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    if (current.length === 0) {
      current.push(line);
      continue;
    }

    const hasBullets = current.some(isBulletLine);
    if (looksLikeEntryHeading(line) && hasBullets) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function splitHeadingAndMeta(line: string) {
  const cleaned = stripMarkdownDecorators(line);
  const parts = cleaned.split(/\s*[|｜]\s*/);

  if (parts.length >= 2) {
    return {
      heading: parts[0].trim(),
      meta: parts.slice(1).join(' | ').trim(),
    };
  }

  const dateIndex = cleaned.search(/(?:19|20)\d{2}/);
  if (dateIndex > 0) {
    return {
      heading: cleaned.slice(0, dateIndex).replace(/[-—–|｜\s]+$/, '').trim(),
      meta: cleaned.slice(dateIndex).trim(),
    };
  }

  return {
    heading: cleaned,
    meta: '',
  };
}

function splitEntryDescriptor(line: string) {
  const cleaned = stripMarkdownDecorators(line);
  const parts = cleaned.split(/\s*[|｜]\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const datePartIndex = parts.findIndex((part) => DATE_RANGE_REGEX.test(part));
  const firstDatePartIndex = datePartIndex === -1 ? parts.length : datePartIndex;
  const descriptorParts = parts.slice(0, firstDatePartIndex);
  const metaParts = datePartIndex === -1 ? [] : parts.slice(datePartIndex);

  if (descriptorParts.length === 0 || metaParts.length === 0) {
    return null;
  }

  if (descriptorParts.length === 1) {
    return {
      heading: descriptorParts[0],
      organization: '',
      meta: metaParts.join(' | '),
    };
  }

  const [first, second] = descriptorParts;
  const firstLooksOrg = ORGANIZATION_HINT_REGEX.test(first);
  const secondLooksRole = ROLE_HINT_REGEX.test(second);

  if (firstLooksOrg && secondLooksRole) {
    return {
      heading: second,
      organization: first,
      meta: metaParts.join(' | '),
    };
  }

  return {
    heading: first,
    organization: descriptorParts.slice(1).join(' | '),
    meta: metaParts.join(' | '),
  };
}

function parseEntryBlock(block: string[]): ResumeEntry | null {
  if (block.length === 0) {
    return null;
  }

  // If the first line is a table line, do not attempt to split it into heading/meta.
  // Directly return it as a plain-text table entry.
  const firstLine = block[0].trim();
  const isFirstLineTable = (firstLine.match(/[|｜]/g) || []).length >= 2 &&
                           (!DATE_RANGE_REGEX.test(firstLine) || /^[|:\-\s]+$/.test(firstLine));
  if (isFirstLineTable) {
    return {
      heading: '',
      meta: '',
      organization: '',
      content: block.join('\n'),
    };
  }

  const meaningfulLines = block.map(stripMarkdownDecorators).filter(Boolean);
  if (meaningfulLines.length === 0) {
    return null;
  }

  const descriptor = splitEntryDescriptor(meaningfulLines[0]);
  const { heading, meta: initialMeta } = descriptor ?? splitHeadingAndMeta(meaningfulLines[0]);
  let meta = initialMeta;
  let organization = descriptor?.organization ?? '';
  const contentLines: string[] = [];

  for (let i = 1; i < block.length; i++) {
    const rawLine = block[i];
    const trimmedRaw = rawLine.trim();

    // Detect if this is a table row (containing at least two pipe characters and no resume date range)
    const isTable = (trimmedRaw.match(/[|｜]/g) || []).length >= 2 &&
                    (!DATE_RANGE_REGEX.test(trimmedRaw) || /^[|:\-\s]+$/.test(trimmedRaw));
    if (isTable) {
      contentLines.push(rawLine);
      continue;
    }

    const line = stripMarkdownDecorators(rawLine);
    if (!line) {
      continue;
    }

    if (isBulletLine(line)) {
      contentLines.push(normalizeBullet(line));
      continue;
    }

    const organizationMetaParts = line.split(/\s*[|｜]\s*/);
    if (
      !organization &&
      organizationMetaParts.length >= 2 &&
      DATE_RANGE_REGEX.test(organizationMetaParts.slice(1).join(' | '))
    ) {
      organization = organizationMetaParts[0].trim();
      meta = meta ? `${meta} | ${organizationMetaParts.slice(1).join(' | ').trim()}` : organizationMetaParts.slice(1).join(' | ').trim();
      continue;
    }

    if (!organization && line.length <= 60 && !DATE_RANGE_REGEX.test(line)) {
      organization = line;
      continue;
    }

    contentLines.push(`- ${line}`);
  }

  return {
    heading,
    meta,
    organization,
    content: contentLines.join('\n'),
  };
}

function parseSkillSection(lines: string[], lang: SupportedLanguage): ResumeEntry[] {
  const hasTable = lines.some((line) => (line.match(/[|｜]/g) || []).length >= 2);
  if (hasTable) {
    return [
      {
        heading: '',
        meta: '',
        organization: '',
        content: lines.join('\n'),
      },
    ];
  }

  const blocks = buildEntryBlocks(lines);
  if (blocks.some((block) => /^#{0,3}\s*技能概览$/i.test(stripMarkdownDecorators(block[0] ?? '')))) {
    return blocks.map(parseEntryBlock).filter((entry): entry is ResumeEntry => Boolean(entry));
  }

  const items = lines
    .flatMap((line) =>
      normalizeLine(line)
        .replace(/^[-*•●▪]\s*/, '')
        .split(/[、,，/]/),
    )
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return [];
  }

  return [
    {
      heading: '',
      meta: '',
      organization: '',
      content: items.map((item) => `- ${item}`).join('\n'),
    },
  ];
}

function parseSection(
  section: { title: string; key: string; lines: string[] },
  lang: SupportedLanguage,
): ResumeSection {
  const trimmedLines = section.lines.map(normalizeLine).filter((line) => line !== '');

  if (section.key === 'summary') {
    return {
      title: section.title,
      content: trimmedLines.join('\n'),
      entries: [],
    };
  }

  if (section.key === 'skills') {
    return {
      title: section.title,
      content: '',
      entries: parseSkillSection(trimmedLines, lang),
    };
  }

  const blocks = buildEntryBlocks(section.lines);
  const entries = blocks.map(parseEntryBlock).filter((entry): entry is ResumeEntry => Boolean(entry));

  if (entries.length > 0) {
    return {
      title: section.title,
      content: '',
      entries,
    };
  }

  return {
    title: section.title,
    content: trimmedLines.join('\n'),
    entries: [],
  };
}

export function parseRawResumeText(text: string, lang: SupportedLanguage): ResumeDraft {
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  const rawLines = normalizedText.split('\n').map(normalizeLine);
  const { frontmatter: parsedFrontmatter, contentLines } = parseFrontmatter(rawLines);
  const lines = contentLines;
  const firstSectionIndex = lines.findIndex(isLikelySectionHeading);

  const frontmatter: ResumeFrontmatter = {
    name: '',
    title: '',
    contact: '',
  };

  frontmatter.name = parsedFrontmatter.name || extractName(lines);
  frontmatter.title = parsedFrontmatter.title || extractTitle(lines, frontmatter.name);
  frontmatter.contact = parsedFrontmatter.contact || buildContact(lines);
  if (parsedFrontmatter.image) {
    frontmatter.image = parsedFrontmatter.image;
  }

  const parsedSections = splitSections(lines, lang).map((section) => parseSection(section, lang));
  const explicitSummary = parsedSections.find((section) => getSectionDefinition(section.title)?.key === 'summary')?.content ?? '';
  const sections = parsedSections.filter((section) => getSectionDefinition(section.title)?.key !== 'summary');

  const summary = explicitSummary || getSummary(lines, firstSectionIndex);

  if (sections.length === 0) {
    const remainingLines = lines
      .filter((line) => line && line !== frontmatter.name && line !== frontmatter.title && !isLikelyContactLine(line))
      .join('\n')
      .trim();

    if (remainingLines) {
      sections.push({
        title: OTHER_TITLES[lang],
        content: '',
        entries: [
          {
            heading: '',
            meta: '',
            organization: '',
            content: remainingLines,
          },
        ],
      });
    }
  }

  return {
    frontmatter,
    summary,
    summaryTitle: SUMMARY_TITLES[lang],
    sections,
  };
}

export function autoFormatResume(rawText: string, lang: SupportedLanguage): string {
  const draft = parseRawResumeText(rawText, lang);
  const lines: string[] = ['---'];

  lines.push(`name: ${draft.frontmatter.name || DEFAULT_NAME[lang]}`);
  lines.push(`title: ${draft.frontmatter.title || DEFAULT_TITLE[lang]}`);
  if (draft.frontmatter.contact) {
    lines.push(`contact: ${draft.frontmatter.contact}`);
  }
  lines.push('---');

  if (draft.summary) {
    lines.push('', `## ${draft.summaryTitle || SUMMARY_TITLES[lang]}`, '', draft.summary);
  }

  for (const section of draft.sections) {
    lines.push('', `## ${section.title}`);

    if (section.content) {
      lines.push('', section.content);
    }

    for (const entry of section.entries) {
      lines.push('');
      if (entry.heading || entry.meta) {
        lines.push(`### ${entry.heading}${entry.meta ? ` | ${entry.meta}` : ''}`.trim());
      }

      if (entry.organization) {
        lines.push(`**${entry.organization}**`);
      }

      if (entry.content) {
        lines.push(entry.content);
      }
    }
  }

  return `${lines.join('\n').trim()}\n`;
}
