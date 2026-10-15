import { test, expect } from '@playwright/test';
import { readZipText } from '../src/test/helpers/zip';
test('HTML export removes scripts and active embeds', async ({ request }) => {
  const result = await request.post('/api/export/html', { data: { html: '<html><body><script>document.body.id="executed"</script><iframe src="http://127.0.0.1:1"></iframe><p onclick="alert(1)">safe</p></body></html>' } });
  expect(result.status()).toBe(200); const html = await result.text();
  expect(html).not.toMatch(/script|iframe|onclick|executed/); expect(html).toContain('safe');
  expect(result.headers()['content-security-policy']).toContain("default-src 'none'");
});
test('invalid exports return actionable client errors', async ({ request }) => {
  expect((await request.post('/api/export/pdf', { data: { html: 42 } })).status()).toBe(400);
  expect((await request.post('/api/export/docx', { data: { draft: { sections: 'invalid' } } })).status()).toBe(400);
  expect((await request.post('/api/export/html', { data: 'not JSON', headers: { 'content-type': 'text/plain' } })).status()).toBe(415);
});
test('DOCX uses A4 and preserves rich text and selected theme', async ({ request }) => {
  const response = await request.post('/api/export/docx', { data: { template: 'minimal', theme: { fontSize: 14, pageMargin: 10, primaryColor: '#123456' },
    draft: { frontmatter: { name: 'Audit', title: 'Engineer', contact: '' }, summary: '**Bold text** and *italic* with [link](https://example.com)', sections: [] } } });
  expect(response.status()).toBe(200);
  const xml = readZipText(await response.body(), 'word/document.xml');
  expect(xml).toContain('w:w="11906"'); expect(xml).toContain('w:h="16838"');
  expect(xml).toContain('<w:b/>'); expect(xml).toContain('<w:i/>'); expect(xml).toContain('123456');
  expect(xml).not.toContain('**'); expect(xml).not.toContain('• *Bold');
  expect(readZipText(await response.body(), 'word/styles.xml')).toContain('w:val="28"');
});

test('DOCX writes native font names and matching East Asian fonts', async ({ request }) => {
  for (const [fontFamily, latin, eastAsia] of [
    ['Source Han Serif SC', 'Noto Serif SC', 'Noto Serif SC'],
    ['Noto Mono', 'Noto Sans Mono', 'Noto Sans SC'],
    ['Noto Serif', 'Noto Serif', 'Noto Serif SC'],
  ]) {
    const response = await request.post('/api/export/docx', { data: { theme: { fontFamily },
      draft: { frontmatter: { name: '字体 Font', title: '工程师', contact: '' }, summary: '正文 Resume', sections: [] } } });
    expect(response.status()).toBe(200);
    const styles = readZipText(await response.body(), 'word/styles.xml');
    expect(styles).toContain(`w:ascii="${latin}"`);
    expect(styles).toContain(`w:eastAsia="${eastAsia}"`);
  }
});
