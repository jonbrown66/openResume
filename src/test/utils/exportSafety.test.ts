// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { Packer } from 'docx';
import { readExportRequest, sanitizeExportHtml, safeFilename } from '@/lib/exportRequest';
import { buildDocx } from '@/lib/docx';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';
import { readZipText } from '@/test/helpers/zip';
describe('export safety', () => {
  it('removes executable markup while preserving layout styles', () => {
    const html = sanitizeExportHtml('<html><head><style>p{color:red}</style></head><body><script>bad()</script><p onclick="bad()">safe</p><img src="http://127.0.0.1/private"></body></html>');
    expect(html).toContain('p{color:red}'); expect(html).toContain('safe');
    expect(html).not.toMatch(/bad|onclick|127\.0/);
  });
  it('rejects invalid requests and limits bodies before parsing', async () => {
    await expect(readExportRequest(new NextRequest('http://localhost/api/export/pdf', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } }))).rejects.toThrow('Invalid JSON');
    await expect(readExportRequest(new NextRequest('http://localhost/api/export/pdf', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', 'content-length': '99999999' } }))).rejects.toMatchObject({ status: 413 });
    expect(safeFilename('bad\r\nname', 'pdf')).not.toContain('\r');
  });
  it.each([
    ['png', 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAAECAIAAAArjXluAAAAFUlEQVR42mP8//8/AwMDEwMDAwYFAE4+AwUPSEQNAAAAAElFTkSuQmCC', 40, 80],
    ['png', 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEklEQVR42mP8//8/AwwwMSABAEgGAwFONe33AAAAAElFTkSuQmCC', 80, 40],
    ['jpeg', '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAEAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AD//Z', 40, 80],
    ['jpeg', '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AD//Z', 80, 40],
    ['jpeg', '/w==', 80, 80],
    ['jpeg', '/9j/4AAQ', 80, 80],
  ] as const)('fits %s avatar case %# without stretching', async (type, data, width, height) => {
    for (const template of ['classic', 'minimal', 'standard', 'sidebar']) {
      const buffer = await Packer.toBuffer(buildDocx({ frontmatter: { name: 'Audit', title: '', contact: '', image: `data:image/${type};base64,${data}` },
        summary: '', sections: [] }, { ...DEFAULT_THEME_CONFIG, fontFamily: 'Noto Sans SC' }, template));
      const xml = readZipText(buffer, 'word/document.xml');
      expect(xml).toContain(`<wp:extent cx="${width * 9525}" cy="${height * 9525}"`);
      expect(xml).toContain(`<a:ext cx="${width * 9525}" cy="${height * 9525}"`);
    }
  });
  it.each(['classic', 'sidebar'])('preserves list blocks and unsplit table rows in %s', async template => {
    const content = '- Parent\n\n  ```text\n  first-code-line\n  second-code-line\n  ```\n\n  | Skill | Level |\n  | --- | --- |\n  | React | Expert |\n\n  - Nested item\n\n| Standalone | Value |\n| --- | --- |\n| Row | Kept |';
    const buffer = await Packer.toBuffer(buildDocx({ frontmatter: { name: 'Audit', title: '', contact: '' }, summary: '',
      sections: [{ title: 'Skills', content, entries: [] }] }, DEFAULT_THEME_CONFIG, template));
    const xml = readZipText(buffer, 'word/document.xml');
    const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
    const code = paragraphs.find(p => p.includes('first-code-line'))!;
    expect(code).toContain('second-code-line'); expect(code).toContain('<w:br/>'); expect(code).toContain('Courier New');
    expect(paragraphs.find(p => p.includes('Nested item'))).toContain('<w:ilvl w:val="1"');
    const rows = [...xml.matchAll(/(?=(<w:tr[ >][\s\S]*?<\/w:tr>))/g)].map(match => match[1])
      .filter(row => !row.includes('<w:tbl>') && />(Skill|React|Standalone|Row)<\/w:t>/.test(row));
    expect(rows).toHaveLength(4);
    rows.forEach(row => expect(row).toContain('<w:cantSplit/>'));
    expect(rows[0]).toContain('<w:tblHeader/>'); expect(rows[2]).toContain('<w:tblHeader/>');
    expect(rows[1]).toContain('React'); expect(rows[1]).toContain('Expert');
  });
  it.each(['classic', 'sidebar'])('keeps independent ordered lists and Markdown starts in %s', async template => {
    const buffer = await Packer.toBuffer(buildDocx({ frontmatter: { name: 'Audit', title: '', contact: '' }, summary: '3. Third\n4. Fourth',
      sections: [{ title: 'Skills', content: '1. First\n2. Second\n\n   5. Nested fifth\n   6. Nested sixth', entries: [
        { heading: 'Role', organization: '', meta: '', content: '7. Seventh' },
      ] }] }, DEFAULT_THEME_CONFIG, template));
    const xml = readZipText(buffer, 'word/document.xml');
    const definitions = readZipText(buffer, 'word/numbering.xml');
    const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
    const id = (text: string) => paragraphs.find(p => p.includes(`>${text}</w:t>`))?.match(/<w:numId w:val="(\d+)"/)?.[1];
    const ids = ['Third', 'First', 'Nested fifth', 'Seventh'].map(id);
    expect(ids.every(Boolean)).toBe(true); expect(new Set(ids).size).toBe(4);
    expect(id('Third')).toBe(id('Fourth')); expect(id('First')).toBe(id('Second')); expect(id('Nested fifth')).toBe(id('Nested sixth'));
    ids.forEach((numId, index) => {
      const concrete = (definitions.match(/<w:num [\s\S]*?<\/w:num>/g) ?? []).find(n => n.includes(`w:numId="${numId}"`))!;
      const abstractId = concrete.match(/<w:abstractNumId w:val="(\d+)"/)![1];
      const abstract = (definitions.match(/<w:abstractNum [\s\S]*?<\/w:abstractNum>/g) ?? []).find(n => n.includes(`w:abstractNumId="${abstractId}"`))!;
      const level = index === 2 ? 1 : 0;
      expect(abstract.match(new RegExp(`<w:lvl w:ilvl="${level}"[\\s\\S]*?</w:lvl>`))?.[0]).toContain(`<w:start w:val="${[3, 1, 5, 7][index]}"`);
      if (!level) expect(concrete).toContain(`<w:startOverride w:val="${[3, 1, 5, 7][index]}"`);
    });
  });
  it('writes section, entry and relative Markdown heading levels with keepNext', async () => {
    const buffer = await Packer.toBuffer(buildDocx({ frontmatter: { name: 'Audit', title: '', contact: '' }, summaryTitle: 'Summary', summary: 'Intro',
      sections: [{ title: 'Experience', content: '', entries: [{ heading: 'Role', organization: '', meta: '',
        content: Array.from({ length: 6 }, (_, index) => `${'#'.repeat(index + 1)} Depth${index + 1}`).join('\n\n') }] }] }, DEFAULT_THEME_CONFIG, 'classic'));
    const paragraphs = readZipText(buffer, 'word/document.xml').match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
    for (const [text, level] of [['Summary', 1], ['Experience', 1], ['Role', 2], ...Array.from({ length: 6 }, (_, index) => [`Depth${index + 1}`, Math.min(index + 3, 6)])]) {
      const paragraph = paragraphs.find(p => p.includes(`>${text}</w:t>`))!;
      expect(paragraph).toContain(`<w:pStyle w:val="Heading${level}"`); expect(paragraph).toContain('<w:keepNext/>');
    }
  });
  it('groups sidebar headings with their content in separate unsplit layout rows', async () => {
    const buffer = await Packer.toBuffer(buildDocx({ frontmatter: { name: 'Audit', title: 'Engineer', contact: '' }, summary: 'Summary text',
      sections: [{ title: 'Experience', content: '', entries: [{ heading: 'Role', organization: 'Team', meta: '', content: '- First result\n- Second result' }] }] }, DEFAULT_THEME_CONFIG, 'sidebar'));
    const xml = readZipText(buffer, 'word/document.xml');
    const rows = xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? [];
    expect(rows.length).toBeGreaterThan(1);
    rows.forEach(row => expect(row).toContain('<w:cantSplit/>'));
    const headingRow = rows.find(row => row.includes('Experience'))!;
    expect(headingRow).toContain('Role'); expect(headingRow).toContain('First result');
    expect(rows.find(row => row.includes('Second result'))).not.toBe(headingRow);
    expect(xml).toContain('w:val="none"');
    const styles = readZipText(buffer, 'word/styles.xml');
    const heading2 = styles.match(/<w:style[^>]*w:styleId="Heading2"[\s\S]*?<\/w:style>/)?.[0];
    expect(heading2).toContain('w:val="111827"');
  });

  it('exports rich Markdown as native DOCX with A4 and theme settings', async () => {
    const document = buildDocx({ frontmatter: { name: 'Audit', title: 'Engineer', contact: '' }, summary: '**Bold** *italic* [link](https://example.com)', sections: [] }, { ...DEFAULT_THEME_CONFIG, fontSize: 14, pageMargin: 10 }, 'minimal');
    const buffer = await Packer.toBuffer(document);
    const xml = readZipText(buffer, 'word/document.xml');
    expect(xml).toContain('w:w="11906"'); expect(xml).toContain('<w:b/>'); expect(xml).toContain('<w:i/>'); expect(xml).not.toContain('**');
    expect(readZipText(buffer, 'word/styles.xml')).toContain('w:val="28"');
  });
});
