import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ExternalHyperlink, ImageRun, LevelFormat } from 'docx';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';

interface Node { type: string; value?: string; url?: string; depth?: number; ordered?: boolean; children?: Node[] }
type Block = Paragraph | Table;
function runs(node: Node, options: { bold?: boolean; italics?: boolean } = {}): (TextRun | ExternalHyperlink)[] {
  if (node.type === 'text' || node.type === 'inlineCode') return [new TextRun({ text: node.value ?? '', ...options, ...(node.type === 'inlineCode' ? { font: 'Courier New' } : {}) })];
  if (node.type === 'break') return [new TextRun({ break: 1 })];
  const children = (node.children ?? []).flatMap(child => runs(child, { ...options,
    ...(node.type === 'strong' ? { bold: true } : {}), ...(node.type === 'emphasis' ? { italics: true } : {}) }));
  if (node.type === 'link' && /^(https?:|mailto:|tel:)/i.test(node.url ?? '')) return [new ExternalHyperlink({ link: node.url!, children })];
  return children;
}
export function markdownBlocks(content: string, depth = 0): Block[] {
  const root = unified().use(remarkParse).use(remarkGfm).parse(content) as Node;
  return (root.children ?? []).flatMap(node => convert(node, depth));
}
function convert(node: Node, depth: number): Block[] {
  if (node.type === 'table') return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
    rows: (node.children ?? []).map((row, index) => new TableRow({ tableHeader: index === 0,
      children: (row.children ?? []).map(cell => new TableCell({ children: [new Paragraph({ children: runs(cell, { bold: index === 0 }) })] })) })) })];
  if (node.type === 'list') return (node.children ?? []).flatMap(item => (item.children ?? []).flatMap((child, index) => {
    if (child.type === 'list') return convert(child, depth + 1);
    return [new Paragraph({ children: runs(child), spacing: { after: 80 },
      ...(index === 0 ? node.ordered ? { numbering: { reference: 'resume-numbered', level: Math.min(depth, 8) } } : { bullet: { level: Math.min(depth, 8) } } : {}) })];
  }));
  if (node.type === 'blockquote') return (node.children ?? []).flatMap(child => convert(child, depth));
  if (node.type === 'code') return [new Paragraph({ children: [new TextRun({ text: node.value ?? '', font: 'Courier New' })] })];
  if (node.type === 'html') return []; // Raw HTML is not a DOCX text run.
  return [new Paragraph({ children: runs(node), spacing: { after: 100 },
    ...(node.type === 'heading' ? { heading: HeadingLevel.HEADING_3 } : {}) })];
}
function sectionBlocks(draft: ResumeDraft, theme: ResumeThemeConfig): Block[] {
  const heading = (title: string) => new Paragraph({ spacing: { before: theme.sectionSpacing * 15, after: 100 },
    children: [new TextRun({ text: title, bold: true, color: theme.primaryColor.slice(1), size: theme.fontSize * 2 + 4 })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: theme.primaryColor.slice(1) } } });
  const blocks: Block[] = [];
  if (draft.summary) blocks.push(heading(draft.summaryTitle || (/[\u4e00-\u9fff]/.test(draft.summary) ? '个人简介' : 'PROFESSIONAL SUMMARY')), ...markdownBlocks(draft.summary));
  for (const section of draft.sections) {
    blocks.push(heading(section.title), ...markdownBlocks(section.content));
    for (const entry of section.entries) {
      if (entry.heading || entry.organization || entry.meta) blocks.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: [
        new TextRun({ text: entry.heading, bold: true }), new TextRun({ text: entry.organization ? ` / ${entry.organization}` : '' }),
        new TextRun({ text: entry.meta ? `    ${entry.meta}` : '', italics: true, color: theme.secondaryColor.slice(1) }),
      ] }));
      blocks.push(...markdownBlocks(entry.content));
    }
  }
  return blocks;
}
export function buildDocx(draft: ResumeDraft, theme: ResumeThemeConfig, template: string) {
  const centered = template === 'standard' || template === 'minimal';
  const header: Block[] = [];
  const image = draft.frontmatter.image?.match(/^data:image\/(png|jpeg);base64,([\s\S]+)$/);
  if (image) header.push(new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new ImageRun({ type: image[1] === 'jpeg' ? 'jpg' : 'png', data: Buffer.from(image[2], 'base64'), transformation: { width: 80, height: 80 } })] }));
  header.push(new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 120 },
    children: [new TextRun({ text: draft.frontmatter.name, size: template === 'minimal' ? 36 : 44, bold: true })] }),
    new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: draft.frontmatter.title, color: theme.primaryColor.slice(1) })] }));
  let content: Block[];
  if (template === 'sidebar') {
    const isAside = (title: string) => /skill|技能|能力|education|教育|certif|证书|language|语言|award|荣誉/i.test(title);
    const aside = { ...draft, summary: draft.sections.some(s => isAside(s.title)) ? '' : draft.summary, sections: draft.sections.filter(s => isAside(s.title)) };
    const main = { ...draft, summary: aside.summary ? '' : draft.summary, sections: draft.sections.filter(s => !isAside(s.title)) };
    content = [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [
      new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: [...(image ? [header.shift()!] : []), new Paragraph(draft.frontmatter.contact), ...sectionBlocks(aside, theme)] }),
      new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [...header, ...sectionBlocks(main, theme)] }),
    ] })] })];
  } else content = [...header, new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun(draft.frontmatter.contact)] }), ...sectionBlocks(draft, theme)];
  const margin = Math.round(theme.pageMargin * 56.6929);
  return new Document({ styles: { default: { document: { run: { font: theme.fontFamily, size: theme.fontSize * 2 },
    paragraph: { spacing: { line: Math.round(theme.lineHeight * 240) } } } } },
    numbering: { config: [{ reference: 'resume-numbered', levels: Array.from({ length: 9 }, (_, level) => ({ level, format: LevelFormat.DECIMAL,
      text: `%${level + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 180 } } } })) }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: margin, right: margin, bottom: margin, left: margin } } }, children: content }] });
}



