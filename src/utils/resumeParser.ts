import type { ResumeDraft, ResumeSection, ResumeEntry, ResumeFrontmatter } from '@/types/resume';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g;
const DATE_RANGE_REGEX = /(\d{4}[年/-]\d{1,2}|\d{4}[年/-]?(至今|现在|Present|Current|present))|(\d{4}[年/-]\d{1,2}[日/-]\d{1,2})/g;

const SECTION_PATTERNS: { pattern: RegExp; title: string }[] = [
  { pattern: /工作经[历驗]|工作经历|职业经历|职业履历|experience|work\s*experience/i, title: 'WORK EXPERIENCE' },
  { pattern: /教育[背景历程]|学历|education|academic/i, title: 'EDUCATION' },
  { pattern: /项目[经历经验]|项目经验|项目经历|projects?|portfolio/i, title: 'PROJECTS' },
  { pattern: /技能|专业技能|技术技能|技术栈|skills?|tech(?:nical)?\s*(?:skills?|stack)/i, title: 'SKILLS' },
  { pattern: /证书|认证|资格证书|certificates?|certifications?/i, title: 'CERTIFICATIONS' },
  { pattern: /语言|语言能力|languages?/i, title: 'LANGUAGES' },
  { pattern: /兴趣爱好?|个人爱好|兴趣|interests?|hobbies?/i, title: 'INTERESTS' },
  { pattern: /奖项|荣誉|获奖|awards?|honors?|achievements?/i, title: 'AWARDS' },
  { pattern: /实习| Internship/i, title: 'INTERNSHIP' },
];

const JOB_TITLE_PATTERNS = [
  /([\u4e00-\u9fa5]{2,10}(经理|总监|主管|专员|助理|工程师|设计师|顾问|Coordinator|Manager|Director|Engineer|Designer|Consultant|Specialist|Assistant|Associate))/g,
];

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const matches = text.match(PHONE_REGEX);
  if (!matches) return null;
  const phone = matches.find(m => m.replace(/\D/g, '').length >= 7);
  return phone || null;
}

function extractName(text: string): string {
  const lines = text.split('\n').filter(l => l.trim());
  
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.trim().replace(/[📧📱☎️电话邮箱地址]/g, '').trim();
    if (cleaned.length >= 2 && cleaned.length <= 20 && /^[a-zA-Z\u4e00-\u9fa5\s·\.]+$/.test(cleaned)) {
      const hasOnlyLetters = /^[a-zA-Z\s·.]+$/.test(cleaned);
      const hasOnlyChinese = /^[\u4e00-\u9fa5\s·]+$/.test(cleaned);
      if (hasOnlyLetters || hasOnlyChinese) {
        return cleaned.replace(/[·.]/g, ' ').trim();
      }
    }
  }
  
  return '';
}

function extractTitle(text: string): string {
  const titlePatterns = [
    /[\u4e00-\u9fa5]{2,10}(经理|总监|主管|专员|助理|工程师|设计师|顾问|Coordinator|Manager|Director|Engineer|Designer|Consultant|Specialist)/,
    /(Senior|Junior|Lead|Principal|Staff|Associate)\s+(?:[\w\s]+(?:Engineer|Designer|Manager|Developer|Architect|Analyst))/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)/,
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return '';
}

function detectSection(text: string): string | null {
  for (const { pattern, title } of SECTION_PATTERNS) {
    if (pattern.test(text)) {
      return title;
    }
  }
  return null;
}

function isJobEntry(text: string): boolean {
  const indicators = [
    /\d{4}[年/-]\d{1,2}/,
    /(公司|企业|集团|Inc|LLC|Corp|Ltd|Co\.)/,
    /责任|负责|完成|推动|提升|增加|管理|带领|协调|主导/g,
  ];
  return indicators.some(p => p.test(text));
}

function isEducationEntry(text: string): boolean {
  const indicators = [
    /(大学|学院|学校|University|College|Institute|School)/,
    /[\u4e00-\u9fa5]{2,10}(学士|硕士|博士|本科|大专)|(Bachelor|Master|PhD|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?)/i,
    /GPA|学分|排名|排名|成绩/,
  ];
  return indicators.some(p => p.test(text));
}

function parseJobEntry(lines: string[]): ResumeEntry | null {
  if (lines.length < 2) return null;
  
  const firstLine = lines[0].trim();
  let heading = '';
  let meta = '';
  
  const dateMatch = firstLine.match(/(\d{4}[年/-]\d{1,2}|[^\d\n]{2,20})\s*[-–]\s*(\d{4}[年/-]\d{1,2}|至今|现在|Present|Current)/);
  if (dateMatch) {
    const titlePart = firstLine.replace(dateMatch[0], '').trim();
    heading = titlePart || firstLine;
    meta = `${dateMatch[1]} - ${dateMatch[2]}`;
  } else {
    heading = firstLine;
  }
  
  let organization = '';
  const contentLines: string[] = [];
  let foundOrg = false;
  
  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (!foundOrg && /^\*\*[^*]+\*\*$/.test(trimmed)) {
      organization = trimmed.replace(/^\*\*|\*\*$/g, '');
      foundOrg = true;
    } else if (!foundOrg && /[\u4e00-\u9fa5]{3,20}(公司|集团|科技|网络|信息|有限公司)|(Inc|LLC|Corp|Ltd)\.?$/i.test(trimmed)) {
      organization = trimmed.replace(/^\*\*|\*\*$/g, '');
      foundOrg = true;
    } else {
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        contentLines.push(trimmed);
      } else if (contentLines.length > 0 || /^[a-zA-Z\u4e00-\u9fa5]/.test(trimmed)) {
        contentLines.push('- ' + trimmed);
      }
    }
  }
  
  if (!heading && !contentLines.length) return null;
  
  return {
    heading: heading.replace(/^###\s*/, '').trim(),
    meta,
    organization,
    content: contentLines.join('\n'),
  };
}

function parseEducationEntry(lines: string[]): ResumeEntry | null {
  if (lines.length < 1) return null;
  
  const firstLine = lines[0].trim();
  let heading = '';
  let meta = '';
  let organization = '';
  
  const degreeMatch = firstLine.match(/([\u4e00-\u9fa5]{2,8}(学士|硕士|博士|本科|大专|研究生)|(Bachelor|Master|PhD|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Associate))/i);
  if (degreeMatch) {
    heading = degreeMatch[0];
  } else {
    heading = firstLine.replace(/^###\s*/, '').trim();
  }
  
  const schoolMatch = lines.find(l => 
    /[\u4e00-\u9fa5]{2,10}(大学|学院|学校)|(University|College|Institute|School)/i.test(l)
  );
  if (schoolMatch) {
    organization = schoolMatch.trim().replace(/^\*\*|\*\*$/g, '');
  }
  
  const dateMatch = firstLine.match(/(\d{4}[年/-]\d{1,2})\s*[-–]\s*(\d{4}[年/-]\d{1,2}|至今|现在|Present)/);
  if (dateMatch) {
    meta = `${dateMatch[1]} - ${dateMatch[2]}`;
  }
  
  const contentLines = lines.slice(1).filter(l => {
    const trimmed = l.trim();
    return trimmed && !/[\u4e00-\u9fa5]{2,10}(大学|学院|学校)|(University|College|Institute|School)/i.test(trimmed);
  }).map(l => l.trim());
  
  return {
    heading,
    meta,
    organization,
    content: contentLines.join('\n'),
  };
}

function parseSkillSection(lines: string[]): ResumeEntry[] {
  const skills: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    const items = trimmed.split(/[,，、|]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30);
    skills.push(...items);
  }
  
  if (skills.length === 0) {
    return [{
      heading: 'Skills',
      meta: '',
      organization: '',
      content: lines.join('\n'),
    }];
  }
  
  return [{
    heading: 'Skills',
    meta: '',
    organization: '',
    content: skills.map(s => `- ${s}`).join('\n'),
  }];
}

function parseSectionLines(lines: string[]): ResumeSection {
  if (lines.length === 0) {
    return { title: 'OTHER', content: '', entries: [] };
  }
  
  const sectionTitle = detectSection(lines[0]) || 'OTHER';
  const contentLines = lines.slice(1).filter(l => l.trim());
  
  const entries: ResumeEntry[] = [];
  let currentEntryLines: string[] = [];
  
  for (const line of contentLines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
      if (currentEntryLines.length > 0) {
        const entry = isEducationEntry(currentEntryLines.join('\n')) 
          ? parseEducationEntry(currentEntryLines)
          : parseJobEntry(currentEntryLines);
        if (entry) entries.push(entry);
        currentEntryLines = [];
      }
      currentEntryLines.push(trimmed);
    } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      if (currentEntryLines.length > 0 && !currentEntryLines[currentEntryLines.length - 1].startsWith('-')) {
        const entry = parseJobEntry(currentEntryLines);
        if (entry) entries.push(entry);
        currentEntryLines = [];
      }
      currentEntryLines.push(trimmed);
    } else if (/^\d{4}[年/-]/.test(trimmed) || /^\([A-Z]\)/.test(trimmed) || /^[\u4e00-\u9fa5]{2,8}(经理|工程师|总监)/.test(trimmed)) {
      if (currentEntryLines.length > 0) {
        const entry = isEducationEntry(currentEntryLines.join('\n'))
          ? parseEducationEntry(currentEntryLines)
          : parseJobEntry(currentEntryLines);
        if (entry) entries.push(entry);
        currentEntryLines = [];
      }
      currentEntryLines.push(trimmed);
    } else if (currentEntryLines.length > 0) {
      currentEntryLines.push(trimmed);
    } else {
      currentEntryLines.push(trimmed);
    }
  }
  
  if (currentEntryLines.length > 0) {
    const entry = isEducationEntry(currentEntryLines.join('\n'))
      ? parseEducationEntry(currentEntryLines)
      : parseJobEntry(currentEntryLines);
    if (entry) entries.push(entry);
  }
  
  if (sectionTitle === 'SKILLS' && entries.length === 0) {
    entries.push(...parseSkillSection(contentLines));
  }
  
  return {
    title: sectionTitle,
    content: '',
    entries,
  };
}

function splitIntoSections(text: string): string[][] {
  const lines = text.split('\n');
  const sections: string[][] = [];
  let currentSection: string[] = [];
  let currentSectionTitle = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^##\s+/.test(trimmed)) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      currentSection = [trimmed];
      currentSectionTitle = trimmed.replace(/^##\s+/, '');
    } else if (/^#{1,2}\s+/.test(trimmed)) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      currentSection = [trimmed];
    } else {
      currentSection.push(trimmed);
    }
  }
  
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}

export function parseRawResumeText(text: string, lang: 'zh' | 'en'): ResumeDraft {
  const frontmatter: ResumeFrontmatter = {
    name: '',
    title: '',
    contact: '',
  };
  
  const name = extractName(text);
  if (name) frontmatter.name = name;
  
  const title = extractTitle(text);
  if (title) frontmatter.title = title;
  
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const contactParts: string[] = [];
  if (phone) contactParts.push(phone);
  if (email) contactParts.push(email);
  if (contactParts.length > 0) frontmatter.contact = contactParts.join(' | ');
  
  const contactInfoRegex = /[\u4e00-\u9fa5]*(地址|Location|Address)[:：]?\s*([^\n]+)/i;
  const addressMatch = text.match(contactInfoRegex);
  if (addressMatch) {
    frontmatter.contact += ' | ' + addressMatch[2].trim();
  }
  
  let summary = '';
  let summaryTitle = lang === 'zh' ? '个人简介' : 'PROFESSIONAL SUMMARY';
  
  const textWithoutContact = text
    .replace(EMAIL_REGEX, '')
    .replace(PHONE_REGEX, '')
    .replace(contactInfoRegex, '');
  
  const firstParaMatch = textWithoutContact.match(/^[^#\n]{50,500}(?=\n\n|$)/m);
  if (firstParaMatch) {
    const firstPara = firstParaMatch[0].trim();
    if (firstPara.length > 30 && !firstPara.includes('http') && !firstPara.includes('www')) {
      summary = firstPara;
    }
  }
  
  const sections: ResumeSection[] = [];
  
  const sectionLines = splitIntoSections(text);
  
  for (const lines of sectionLines) {
    if (lines.length === 0) continue;
    
    const firstLine = lines[0];
    const isAlreadyHeader = /^#{1,3}\s+/.test(firstLine);
    
    if (isAlreadyHeader) {
      const section = parseSectionLines(lines);
      if (section.entries.length > 0 || section.content) {
        if (summaryTitle !== section.title) {
          sections.push(section);
        }
      }
    } else {
      const detectedTitle = detectSection(firstLine);
      if (detectedTitle) {
        const section = parseSectionLines([`## ${detectedTitle}`, ...lines.slice(1)]);
        sections.push(section);
      } else if (lines.join('\n').length > 50) {
        const section: ResumeSection = {
          title: lang === 'zh' ? '其他' : 'OTHER',
          content: '',
          entries: [{
            heading: '',
            meta: '',
            organization: '',
            content: lines.join('\n'),
          }],
        };
        sections.push(section);
      }
    }
  }
  
  if (summary && sections.length === 0) {
    sections.push({
      title: summaryTitle,
      content: summary,
      entries: [],
    });
  }
  
  return {
    frontmatter,
    summary,
    summaryTitle,
    sections,
  };
}

export function autoFormatResume(rawText: string, lang: 'zh' | 'en'): string {
  const draft = parseRawResumeText(rawText, lang);
  
  const frontmatterParts: string[] = ['---'];
  frontmatterParts.push(`name: ${draft.frontmatter.name || (lang === 'zh' ? '姓名' : 'Name')}`);
  frontmatterParts.push(`title: ${draft.frontmatter.title || (lang === 'zh' ? '职位' : 'Title')}`);
  if (draft.frontmatter.contact) {
    frontmatterParts.push(`contact: ${draft.frontmatter.contact}`);
  }
  frontmatterParts.push('---');
  
  const lines: string[] = [frontmatterParts.join('\n')];
  
  if (draft.summary) {
    lines.push('', `## ${draft.summaryTitle}`, '', draft.summary);
  }
  
  for (const section of draft.sections) {
    lines.push('');
    
    const sectionLines: string[] = [`## ${section.title}`];
    
    if (section.content) {
      sectionLines.push('', section.content);
    }
    
    for (const entry of section.entries) {
      sectionLines.push('');
      sectionLines.push(`### ${entry.heading}${entry.meta ? ` | ${entry.meta}` : ''}`);
      
      if (entry.organization) {
        sectionLines.push(`**${entry.organization}**`);
      }
      
      if (entry.content) {
        sectionLines.push(entry.content);
      }
    }
    
    lines.push(sectionLines.join('\n'));
  }
  
  return lines.join('\n').trim() + '\n';
}
