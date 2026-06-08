import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';

interface ResumeFrontmatter {
  name: string;
  title: string;
  contact: string;
  image?: string;
}

interface ResumeEntry {
  heading: string;
  meta: string;
  organization: string;
  content: string;
}

interface ResumeSection {
  title: string;
  content: string;
  entries: ResumeEntry[];
}

interface ResumeDraft {
  frontmatter: ResumeFrontmatter;
  summary: string;
  summaryTitle?: string;
  sections: ResumeSection[];
}

type DocxBlock = Paragraph | Table;

function parseMarkdownContent(content: string): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 检测是否为表格行
    if (line.trim().startsWith('|') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const isSeparator = nextLine.startsWith('|') && nextLine.replace(/[|:\s-]/g, '').length === 0;

      if (isSeparator) {
        const tableRowsData: string[][] = [];

        // 解析表头
        const headers = line.split('|')
          .map(cell => cell.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRowsData.push(headers);

        i += 2; // 跳过表头和分割线

        // 解析内容行
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const bodyCells = lines[i].split('|')
            .map(cell => cell.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          tableRowsData.push(bodyCells);
          i++;
        }

        if (tableRowsData.length > 0) {
          const docxTable = new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: tableRowsData.map((rowData, rowIndex) => {
              const isHeader = rowIndex === 0;
              return new TableRow({
                children: rowData.map(cellText => {
                  return new TableCell({
                    width: {
                      size: Math.round(100 / rowData.length),
                      type: WidthType.PERCENTAGE,
                    },
                    shading: isHeader ? { fill: "F2F2F2" } : undefined,
                    children: [
                      new Paragraph({
                        spacing: { before: 100, after: 100 },
                        children: [
                          new TextRun({
                            text: cellText,
                            bold: isHeader,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  });
                }),
              });
            }),
          });

          blocks.push(docxTable);
          blocks.push(new Paragraph({ spacing: { before: 100, after: 100 } }));
        }
        continue;
      }
    }

    // 普通文本或列表
    const cleanedLine = line.replace(/^[-*]\s*/, '').trim();
    if (cleanedLine) {
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
      blocks.push(
        new Paragraph({
          spacing: { before: 50, after: 50 },
          indent: isBullet ? { left: 720 } : undefined,
          children: [
            new TextRun({
              text: isBullet ? "• " + cleanedLine : cleanedLine,
              size: 20,
            }),
          ],
        })
      );
    }

    i++;
  }

  return blocks;
}

function isChineseText(value: string): boolean {
  return /[\u4e00-\u9fa5]/.test(value);
}

function createSectionTitle(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22,
      }),
    ],
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: "CCCCCC",
      },
    },
  });
}

function createEntry(heading: string, meta: string, organization: string, content: string): DocxBlock[] {
  const children: DocxBlock[] = [];

  if (heading || organization || meta) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: heading, bold: true, size: 22 }),
          ...(organization
            ? [
                new TextRun({ text: " / ", size: 22, color: "888888" }),
                new TextRun({ text: organization, size: 22, color: "888888" }),
              ]
            : []),
          new TextRun({ text: "  ", size: 22 }),
          new TextRun({ text: meta, italics: true, size: 20, color: "666666" }),
        ],
      })
    );
  }

  if (content) {
    children.push(...parseMarkdownContent(content));
  }

  return children;
}

function buildDocx(draft: ResumeDraft, template: string = 'classic'): DocxBlock[] {
  const children: DocxBlock[] = [];
  const { frontmatter } = draft;
  const primaryColor = "1a1a1a";
  const secondaryColor = "666666";

  if (template === 'standard') {
    children.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({ text: (frontmatter.name || 'NAME').toUpperCase(), bold: true, size: 44, color: primaryColor }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: frontmatter.title || 'Title', size: 24, color: secondaryColor }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    if (frontmatter.contact) {
      const contactText = frontmatter.contact.split('|').join('   |   ');
      children.push(
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({ text: contactText, size: 18, color: secondaryColor }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );
    }
  } else if (template === 'minimal') {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: (frontmatter.name || 'NAME').toUpperCase(), bold: true, size: 36, color: primaryColor }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: (frontmatter.title || 'Title').toUpperCase(), size: 18, color: secondaryColor }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    if (frontmatter.contact) {
      children.push(
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({ text: frontmatter.contact.toUpperCase(), size: 16, color: secondaryColor }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );
    }
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({ text: (frontmatter.name || 'NAME').toUpperCase(), bold: true, size: 56, color: primaryColor }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: frontmatter.title || 'Title', size: 28, color: secondaryColor }),
        ],
      })
    );
    if (frontmatter.contact) {
      children.push(
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({ text: frontmatter.contact, size: 18, color: secondaryColor }),
          ],
        })
      );
    }
  }

  const summaryTitle = draft.summaryTitle || (isChineseText(`${draft.frontmatter.name} ${draft.summary}`) ? '个人简介' : 'PROFESSIONAL SUMMARY');
  if (draft.summary) {
    children.push(createSectionTitle(summaryTitle));
    children.push(...parseMarkdownContent(draft.summary));
  }

  for (const section of draft.sections) {
    children.push(createSectionTitle(section.title));

    if (section.content) {
      children.push(...parseMarkdownContent(section.content));
    }

    for (const entry of section.entries) {
      const entryParagraphs = createEntry(entry.heading, entry.meta, entry.organization, entry.content);
      children.push(...entryParagraphs);
    }
  }

  return children;
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { draft, template = 'classic', filename = 'resume' } = await request.json();

    if (!draft) {
      return NextResponse.json({ error: 'Draft is required' }, { status: 400 });
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 12240,
                height: 15840,
              },
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: buildDocx(draft, template),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const encodedFilename = encodeURIComponent(`${filename}.docx`);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('Word generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Word document' }, { status: 500 });
  }
}
