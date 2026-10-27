import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ExternalHyperlink, ImageRun, LevelFormat, type INumberingOptions, type IParagraphOptions } from 'docx';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeThemeConfig } from '@/types/theme';
import { fontNativeName, isBuiltinFont, resolveFont } from '@/lib/resumeFonts';

interface Node { type: string; value?: string; url?: string; depth?: number; ordered?: boolean; start?: number; children?: Node[] }
type Numbering = INumberingOptions['config'][number][];
type Block = Paragraph | Table;
const headingParagraphs = new WeakSet<Paragraph>();
function groupedBlocks(blocks: Block[]) {
  const groups: Block[][] = [];
  for (let index = 0; index < blocks.length; index++) {
    const group = [blocks[index]];
    while (group[group.length - 1] instanceof Paragraph && headingParagraphs.has(group[group.length - 1] as Paragraph) && index + 1 < blocks.length) group.push(blocks[++index]);
    groups.push(group);
  }
  return groups;
}
function runs(node: Node, options: { bold?: boolean; italics?: boolean } = {}): (TextRun | ExternalHyperlink)[] {
  if (node.type === 'text' || node.type === 'inlineCode') return [new TextRun({ text: node.value ?? '', ...options, ...(node.type === 'inlineCode' ? { font: 'Courier New' } : {}) })];
  if (node.type === 'break') return [new TextRun({ break: 1 })];
  const children = (node.children ?? []).flatMap(child => runs(child, { ...options,
    ...(node.type === 'strong' ? { bold: true } : {}), ...(node.type === 'emphasis' ? { italics: true } : {}) }));
  if (node.type === 'link' && /^(https?:|mailto:|tel:)/i.test(node.url ?? '')) return [new ExternalHyperlink({ link: node.url!, children })];
  return children;
}
export function markdownBlocks(content: string, depth = 0, numbering: Numbering = []): Block[] {
  const root = unified().use(remarkParse).use(remarkGfm).parse(content) as Node;
  return (root.children ?? []).flatMap(node => convert(node, depth, numbering));
}
function convert(node: Node, depth: number, numbering: Numbering, paragraph: IParagraphOptions = {}): Block[] {
  if (node.type === 'table') return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
    rows: (node.children ?? []).map((row, index) => new TableRow({ tableHeader: index === 0, cantSplit: true,
      children: (row.children ?? []).map(cell => new TableCell({ children: [new Paragraph({ children: runs(cell, { bold: index === 0 }) })] })) })) })];
  if (node.type === 'list') {
    const level = Math.min(depth, 8);
    const reference = `resume-numbered-${numbering.length}`;
    if (node.ordered) numbering.push({ reference, levels: Array.from({ length: 9 }, (_, level) => ({ level, format: LevelFormat.DECIMAL,
      start: level === Math.min(depth, 8) ? node.start ?? 1 : 1, text: `%${level + 1}.`, alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 180 } } } })) });
    return (node.children ?? []).flatMap(item => (item.children ?? []).flatMap((child, index) =>
      child.type === 'list' ? convert(child, depth + 1, numbering) : convert(child, depth, numbering, {
        spacing: { after: 80 }, indent: { left: 360 * (level + 1) },
        ...(index === 0 ? node.ordered ? { numbering: { reference, level, instance: 0 } } : { bullet: { level } } : {}),
      })));
  }
  if (node.type === 'blockquote') return (node.children ?? []).flatMap(child => convert(child, depth, numbering, paragraph));
  if (node.type === 'code') return [new Paragraph({ ...paragraph, children: (node.value ?? '').split('\n').map((text, index) =>
    new TextRun({ text, font: 'Courier New', ...(index ? { break: 1 } : {}) })) })];
  if (node.type === 'html') return []; // Raw HTML is not a DOCX text run.
  const headings = [HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  return [new Paragraph({ spacing: { after: 100 }, keepLines: true, ...paragraph, children: runs(node),
    ...(node.type === 'heading' ? { heading: headings[Math.min(Math.max((node.depth ?? 1) - 1, 0), 3)], keepNext: true } : {}) })];
}
function sectionBlocks(draft: ResumeDraft, theme: ResumeThemeConfig, numbering: Numbering): Block[] {
  const heading = (title: string) => {
    const paragraph = new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: theme.sectionSpacing * 15, after: 100 },
      children: [new TextRun({ text: title, bold: true, color: theme.primaryColor.slice(1), size: theme.fontSize * 2 + 4 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: theme.primaryColor.slice(1) } } });
    headingParagraphs.add(paragraph);
    return paragraph;
  };
  const blocks: Block[] = [];
  if (draft.summary) blocks.push(heading(draft.summaryTitle || (/[\u4e00-\u9fff]/.test(draft.summary) ? '个人简介' : 'PROFESSIONAL SUMMARY')), ...markdownBlocks(draft.summary, 0, numbering));
  for (const section of draft.sections) {
    blocks.push(heading(section.title), ...markdownBlocks(section.content, 0, numbering));
    for (const entry of section.entries) {
      if (entry.heading || entry.organization || entry.meta) {
        const paragraph = new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 160, after: 80 }, children: [
          new TextRun({ text: entry.heading, bold: true }), new TextRun({ text: entry.organization ? ` / ${entry.organization}` : '' }),
          new TextRun({ text: entry.meta ? `    ${entry.meta}` : '', italics: true, color: theme.secondaryColor.slice(1) }),
        ] });
        headingParagraphs.add(paragraph);
        blocks.push(paragraph);
      }
      blocks.push(...markdownBlocks(entry.content, 0, numbering));
    }
  }
  return blocks;
}
function imageSize(data: Buffer, type: string) {
  let width = 0, height = 0;
  if (type === 'png' && data.length >= 24 && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && data.toString('ascii', 12, 16) === 'IHDR') {
    width = data.readUInt32BE(16); height = data.readUInt32BE(20);
  } else if (type === 'jpeg' && data.length >= 2 && data.readUInt16BE(0) === 0xffd8) {
    for (let offset = 2; offset + 3 < data.length;) {
      if (data[offset++] !== 0xff) break;
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > data.length) break;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        height = data.readUInt16BE(offset + 3); width = data.readUInt16BE(offset + 5); break;
      }
      offset += length;
    }
  }
  const scale = 80 / Math.max(width, height);
  return width && height ? { width: width * scale, height: height * scale } : { width: 80, height: 80 };
}
export function buildDocx(draft: ResumeDraft, theme: ResumeThemeConfig, template: string) {
  const numbering: Numbering = [];
  const centered = template === 'standard' || template === 'minimal';
  const header: Block[] = [];
  const image = draft.frontmatter.image?.match(/^data:image\/(png|jpeg);base64,([\s\S]+)$/);
  if (image) {
    const data = Buffer.from(image[2], 'base64');
    header.push(new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new ImageRun({ type: image[1] === 'jpeg' ? 'jpg' : 'png', data, transformation: imageSize(data, image[1]) })] }));
  }
  header.push(new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 120 },
    children: [new TextRun({ text: draft.frontmatter.name, size: template === 'minimal' ? 36 : 44, bold: true })] }),
    new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: draft.frontmatter.title, color: theme.primaryColor.slice(1) })] }));
  let content: Block[];
  if (template === 'sidebar') {
    const isAside = (title: string) => /skill|技能|能力|education|教育|certif|证书|language|语言|award|荣誉/i.test(title);
    const aside = { ...draft, summary: draft.sections.some(s => isAside(s.title)) ? '' : draft.summary, sections: draft.sections.filter(s => isAside(s.title)) };
    const main = { ...draft, summary: aside.summary ? '' : draft.summary, sections: draft.sections.filter(s => !isAside(s.title)) };
    const asideHeader = [...(image ? [header.shift()!] : []), new Paragraph(draft.frontmatter.contact)];
    const asideBlocks = groupedBlocks(sectionBlocks(aside, theme, numbering));
    const mainBlocks = groupedBlocks(sectionBlocks(main, theme, numbering));
    asideBlocks.unshift([...asideHeader, ...(asideBlocks.shift() ?? [])]);
    mainBlocks.unshift([...header, ...(mainBlocks.shift() ?? [])]);
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    content = [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
      rows: Array.from({ length: Math.max(asideBlocks.length, mainBlocks.length) }, (_, index) => new TableRow({ cantSplit: true, children: [
      new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: asideBlocks[index] ?? [new Paragraph('')] }),
      new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: mainBlocks[index] ?? [new Paragraph('')] }),
    ] })) })];
  } else content = [...header, new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun(draft.frontmatter.contact)] }), ...sectionBlocks(draft, theme, numbering)];
  const margin = Math.round(theme.pageMargin * 56.6929);
  const nativeFont = fontNativeName(theme.fontFamily);
  const eastAsiaFont = isBuiltinFont(theme.fontFamily) && !['Noto Serif SC', 'Noto Sans SC'].includes(resolveFont(theme.fontFamily)) ? (resolveFont(theme.fontFamily) === 'Noto Serif' ? 'Noto Serif SC' : 'Noto Sans SC') : nativeFont;
  return new Document({ background: { color: theme.backgroundColor.slice(1) }, styles: { default: { document: { run: { font: { ascii: nativeFont, hAnsi: nativeFont, eastAsia: eastAsiaFont, cs: nativeFont }, size: theme.fontSize * 2 },
    paragraph: { spacing: { line: Math.round(theme.lineHeight * 240) } } },
    heading1: { run: { color: theme.primaryColor.slice(1), size: theme.fontSize * 2 + 4, bold: true } },
    heading2: { run: { color: '111827', size: theme.fontSize * 2, bold: false } },
    heading3: { run: { color: theme.primaryColor.slice(1), size: theme.fontSize * 2, bold: true } },
    heading4: { run: { color: theme.primaryColor.slice(1), size: theme.fontSize * 2, bold: true } },
    heading5: { run: { color: theme.primaryColor.slice(1), size: theme.fontSize * 2, bold: true } },
    heading6: { run: { color: theme.primaryColor.slice(1), size: theme.fontSize * 2, bold: true } },
  } },
    numbering: { config: numbering },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: margin, right: margin, bottom: margin, left: margin } } }, children: content }] });
}



