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
  it('exports rich Markdown as native DOCX with A4 and theme settings', async () => {
    const document = buildDocx({ frontmatter: { name: 'Audit', title: 'Engineer', contact: '' }, summary: '**Bold** *italic* [link](https://example.com)', sections: [] }, { ...DEFAULT_THEME_CONFIG, fontSize: 14, pageMargin: 10 }, 'minimal');
    const buffer = await Packer.toBuffer(document);
    const xml = readZipText(buffer, 'word/document.xml');
    expect(xml).toContain('w:w="11906"'); expect(xml).toContain('<w:b/>'); expect(xml).toContain('<w:i/>'); expect(xml).not.toContain('**');
    expect(readZipText(buffer, 'word/styles.xml')).toContain('w:val="28"');
  });
});
