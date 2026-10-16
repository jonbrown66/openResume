import type { Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';
import { sanitizeExportHtml } from '../src/lib/exportRequest';

const markdown = `---\nname: 分页验证\ntitle: 测试工程师\n---\n\n${Array.from({ length: 4 }, (_, section) =>
  `## 工作经历 ${section}\n\n### 测试负责人 | 2020 - 2026\n\n**项目与交付**\n\n${Array.from({ length: 12 }, (_, i) =>
    `- 验证项 ${section}-${i}：负责智能设备与移动端 APP 的端到端互联测试，**覆盖中文粗体与 English mixed text**，推动缺陷闭环和版本发布。${'确保每一行内容完整呈现，调整排版后仍然可以阅读。'.repeat(i % 3 + 1)}`).join('\n')}\n\n| 验证表格 | 结果 |\n| --- | --- |\n| 表格记录 ${section} | 完整保留 |`).join('\n\n')}`;

async function assertCompleteLines(page: Page, sourceLines?: Array<[string, number]>) {
  if (!sourceLines) await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  const result = await page.evaluate(sourceLines => {
    const expected = new Map<string, number>(sourceLines);
    const actual = new Map<string, number>();
    const crossings: string[] = [];
    function collect(root: Element, counts: Map<string, number>, bounds?: DOMRect, scale = 1) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim() || node.parentElement?.closest('style,script,[aria-hidden="true"]:not(.resume-measure)')) continue;
        if (getComputedStyle(node.parentElement!).visibility === 'hidden') continue;
        const range = document.createRange(); range.selectNodeContents(node);
        Array.from(range.getClientRects()).forEach((rect, index) => {
          if (!rect.height || !rect.width) return;
          const key = `${node.textContent}|${index}`;
          if (bounds) {
            const tolerance = 0.3 * scale;
            if (rect.bottom <= bounds.top + tolerance || rect.top >= bounds.bottom - tolerance) return;
            if (rect.top < bounds.top - tolerance || rect.bottom > bounds.bottom + tolerance) crossings.push(key);
          }
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });
      }
    }
    if (!sourceLines) collect(document.querySelector('.resume-measure')!, expected);
    const viewports = document.querySelectorAll<HTMLElement>('[data-page-viewport]');
    viewports.forEach(viewport => {
      const bounds = viewport.getBoundingClientRect();
      collect(viewport, actual, bounds, bounds.width / viewport.offsetWidth);
    });
    if (!viewports.length) collect(document.querySelector('.resume-paper')!, actual);
    const mismatches = [...new Set([...expected.keys(), ...actual.keys()])]
      .filter(key => expected.get(key) !== actual.get(key)).map(key => ({ key, expected: expected.get(key), actual: actual.get(key) }));
    return { crossings, mismatches, sourceLines: [...expected.entries()], lines: [...expected.values()].reduce((a, b) => a + b, 0) };
  }, sourceLines);
  expect(result.lines).toBeGreaterThan(100);
  expect(result.crossings, 'No text fragment may straddle a page edge').toEqual([]);
  expect(result.mismatches, 'Every source line must appear exactly once with the same wrapping').toEqual([]);
  return result.sourceLines;
}

for (const fontFamily of ['Geist', 'Noto Serif SC']) {
  for (const template of ['classic', 'sidebar']) {
    test(`${template} ${fontFamily}: minimum line height keeps long paragraphs and PDF text complete`, async ({ page }, testInfo) => {
      test.setTimeout(90000);
      const markdown = '---\nname: 边界验证\ntitle: 测试工程师\n---\n\n## 工作经历\n\n' +
        '负责智能设备互联测试与版本发布，确保每一行文字完整呈现。'.repeat(240);
      await page.addInitScript(({ markdown, data, theme, template }) => {
        localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'line-height', name: 'Line height', markdown, data, theme,
          layout: {}, templateId: template, createdAt: 1, updatedAt: 1 }], currentProjectId: 'line-height' }));
        localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
      }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: { ...DEFAULT_THEME_CONFIG, fontFamily, lineHeight: 1 }, template });
      await page.goto('/');
      const preview = page.getByRole('button', { name: 'Preview', exact: true });
      if (await preview.isVisible()) await preview.click();
      await assertCompleteLines(page);
      const more = page.getByRole('button', { name: 'More Actions', exact: true });
      if (await more.isVisible()) { await more.click(); await page.getByRole('menuitem', { name: 'Style', exact: true }).click(); }
      else await page.getByRole('button', { name: 'Style', exact: true }).click();
      const panel = page.getByRole('dialog', { name: 'Style Editor' });
      await panel.getByRole('spinbutton', { name: 'Line Height (value)', exact: true }).fill('1.8');
      await assertCompleteLines(page);
      await expect(page.locator('.resume-measure .resume-content p').first()).not.toHaveAttribute('data-resume-safe-line-height', '');
      await panel.getByRole('spinbutton', { name: 'Line Height (value)', exact: true }).fill('1');
      await assertCompleteLines(page);
      await page.keyboard.press('Escape');
      const sourceText = await page.locator('.resume-measure').evaluate(element => {
        const clone = element.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('style,script').forEach(node => node.remove());
        return clone.textContent!;
      });
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const downloading = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'Export PDF', exact: true }).click();
      const file = await downloading;
      const path = testInfo.outputPath('minimum-line-height.pdf');
      await file.saveAs(path);
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const task = getDocument({ data: new Uint8Array(await readFile(path)) });
      try {
        const pdf = await task.promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const content = await (await pdf.getPage(i)).getTextContent();
          text += content.items.map(item => 'str' in item ? item.str : '').join('');
        }
        expect(Array.from(text.replace(/\s/g, '')).sort()).toEqual(Array.from(sourceText.replace(/\s/g, '')).sort());
      } finally { await task.destroy(); }
    });
  }
}

for (const template of ['classic', 'minimal', 'standard', 'sidebar']) {
  test(`${template}: Chinese mixed text survives pagination, style changes and exports`, async ({ page, context }, testInfo) => {
    test.setTimeout(90000);
    await page.addInitScript(({ markdown, data, theme, template }) => {
      localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'pagination', name: 'Pagination', markdown, data, theme,
        layout: {}, templateId: template, createdAt: 1, updatedAt: 1 }], currentProjectId: 'pagination' }));
      localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
    }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: { ...DEFAULT_THEME_CONFIG,
      customCss: '.resume-list > li:nth-child(2n) { margin-top: 3.25px; }' }, template });
    await page.goto('/');
    const preview = page.getByRole('button', { name: 'Preview', exact: true });
    if (await preview.isVisible()) await preview.click();
    await assertCompleteLines(page);
    const more = page.getByRole('button', { name: 'More Actions', exact: true });
    if (await more.isVisible()) { await more.click(); await page.getByRole('menuitem', { name: 'Style', exact: true }).click(); }
    else await page.getByRole('button', { name: 'Style', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Style Editor' });
    for (const [label, value] of [['Font Size (pt)', '12.5'], ['Line Height (value)', '1.65'], ['Page Margin (mm)', '17'], ['Section Spacing (px)', '27']]) {
      await panel.getByRole('spinbutton', { name: label, exact: true }).fill(value);
      await assertCompleteLines(page);
    }
    if (template === 'classic') {
      await panel.getByRole('combobox').click();
      await page.getByRole('option', { name: 'Noto Serif SC', exact: true }).click();
      await expect(panel.getByRole('combobox')).toContainText('Noto Serif SC');
      await assertCompleteLines(page);
    }
    // Export immediately after the final style edit; the export path must await its pagination.
    await panel.getByRole('spinbutton', { name: 'Section Spacing (px)', exact: true }).fill('28');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const requestPromise = page.waitForRequest(request => request.url().endsWith('/api/export/pdf'));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export PDF', exact: true }).click();
    const exportRequest = await requestPromise;
    const download = await downloadPromise;
    const sourceLines = await assertCompleteLines(page);
    const expectedText = await page.locator('.resume-measure').evaluate(element => {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('style,script').forEach(node => node.remove());
      // Include template decorations that are real PDF text (e.g. Minimal's role slash).
      const decorations = Array.from(element.querySelectorAll('*')).flatMap(node => ['::before', '::after'].map(pseudo => {
        const content = getComputedStyle(node, pseudo).content;
        return content.startsWith('"') && content.endsWith('"') ? JSON.parse(content) as string : '';
      })).join('');
      return clone.textContent! + decorations;
    });
    const pageCount = await page.locator('.resume-paper-page-card').count();
    const pdfPath = testInfo.outputPath('pagination.pdf');
    await download.saveAs(pdfPath);
    const html = exportRequest.postDataJSON().html as string;
    await writeFile(testInfo.outputPath('pagination.html'), html);
    const offline = await context.newPage();
    await offline.route('**/*', route => route.abort());
    await offline.setContent(sanitizeExportHtml(html));
    await offline.evaluate(() => document.fonts.ready);
    await assertCompleteLines(offline, sourceLines);
    await offline.screenshot({ path: testInfo.outputPath('export-pages.png'), fullPage: true });
    await offline.close();
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = getDocument({ data: new Uint8Array(await readFile(pdfPath)), useSystemFonts: true });
    const pdf = await loadingTask.promise;
    try {
      expect(pdf.numPages).toBe(pageCount);
      const texts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        texts.push(content.items.map(item => 'str' in item ? item.str : '').join(''));
      }
      const characters = (value: string) => {
        const counts = new Map<string, number>();
        for (const char of value.replace(/[\s•·]/g, '')) counts.set(char, (counts.get(char) ?? 0) + 1);
        return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
      };
      expect(characters(texts.join('')), 'PDF must retain every source character exactly once').toEqual(characters(expectedText));
    } finally { await loadingTask.destroy(); }
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const htmlDownload = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
    const htmlFile = await htmlDownload;
    const htmlPage = await context.newPage();
    await htmlPage.route('**/*', route => route.abort());
    await htmlPage.setContent(await readFile((await htmlFile.path())!, 'utf8'));
    await htmlPage.evaluate(() => document.fonts.ready);
    await assertCompleteLines(htmlPage, sourceLines);
    await htmlPage.close();
  });
}
