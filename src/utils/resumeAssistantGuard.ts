import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import type { ResumeEntry, ResumeSection } from '@/types/resume';

const WORK_SECTION_PATTERN = /work experience|experience|employment|工作经历|工作经验|职业经历/i;

function getWorkEntries(markdown: string): ResumeEntry[] {
  const draft = parseMarkdownToResumeDraft(markdown);
  const workSection = draft.sections.find((section: ResumeSection) =>
    WORK_SECTION_PATTERN.test(section.title),
  );

  return workSection?.entries.filter((entry) => entry.heading || entry.organization || entry.meta) ?? [];
}

function buildIdentity(entry: ResumeEntry) {
  return `${entry.heading.trim()}::${entry.organization.trim()}`;
}

export function getResumeAssistantRiskWarnings(
  originalMarkdown: string,
  proposedMarkdown: string,
): string[] {
  const originalEntries = getWorkEntries(originalMarkdown);
  const proposedEntries = getWorkEntries(proposedMarkdown);
  const warnings: string[] = [];
  const original = parseMarkdownToResumeDraft(originalMarkdown);
  const proposed = parseMarkdownToResumeDraft(proposedMarkdown);
  if (original.sections.some(section => !proposed.sections.some(candidate => candidate.title === section.title)) || original.summary && !proposed.summary) warnings.push('resume sections removed');
  if (original.frontmatter.name !== proposed.frontmatter.name || original.frontmatter.contact !== proposed.frontmatter.contact) warnings.push('personal information changed');
  const numbers = (text: string) => new Set(text.match(/\d+(?:[.,]\d+)?\s*%/g) ?? []);
  const originalNumbers = numbers(originalMarkdown);
  if ([...numbers(proposedMarkdown)].some(number => !originalNumbers.has(number))) warnings.push('new numeric claims added');

  if (originalEntries.length === 0) return warnings;

  const originalOrder = originalEntries.map(buildIdentity);
  const proposedOrder = proposedEntries.map(buildIdentity);

  if (
    originalOrder.length !== proposedOrder.length ||
    originalOrder.some((identity, index) => proposedOrder[index] !== identity)
  ) {
    warnings.push('work experience order changed');
  }

  const comparableLength = Math.min(originalEntries.length, proposedEntries.length);
  const hasDateChange = Array.from({ length: comparableLength }).some((_, index) => {
    return originalEntries[index].meta.trim() !== proposedEntries[index].meta.trim();
  });

  if (hasDateChange) {
    warnings.push('work experience dates changed');
  }

  return warnings;
}
