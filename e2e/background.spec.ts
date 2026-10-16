import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';
import { readZipText } from '../src/test/helpers/zip';

async function openStyle(page: Page) {
  const more = page.getByRole('button', { name: 'More Actions', exact: true });
  if (await more.isVisible()) { await more.click(); await page.getByRole('menuitem', { name: 'Style', exact: true }).click(); }
  else await page.getByRole('button', { name: 'Style', exact: true }).click();
  return page.getByRole('dialog', { name: 'Style Editor' });
}

test('paper background persists across templates and survives exports and reset', async ({ page, context }, testInfo) => {
  const markdown = '---\nname: 背景色验证\ntitle: Engineer\n---\n\n## 工作经历\n\n测试简历背景色与导出。';
  await page.addInitScript(({ markdown, data, theme }) => {
    if (localStorage.getItem('resume_projects')) return;
    localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'background', name: 'Background', markdown, data, theme,
      layout: {}, templateId: 'classic', createdAt: 1, updatedAt: 1 }], currentProjectId: 'background' }));
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
  }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: { ...DEFAULT_THEME_CONFIG, backgroundColor: undefined } });
  await page.goto('/');
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  let panel = await openStyle(page);
  await expect(panel.getByLabel('Resume Background', { exact: true })).toHaveValue('#ffffff');
  await panel.getByRole('button', { name: 'Resume Background: #faf9f3', exact: true }).click();
  await page.keyboard.press('Escape');
  for (const template of ['Classic', 'Minimal', 'Standard', 'Sidebar']) {
    await page.getByRole('button', { name: template, exact: true }).click();
    await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
    await expect(page.locator('.resume-paper-page-card').first()).toHaveCSS('background-color', 'rgb(250, 249, 243)');
    await expect(page.locator('.resume-measure .resume-template').first()).toHaveCSS('--resume-paper', '#faf9f3');
  }
  await page.reload();
  panel = await openStyle(page);
  await expect(panel.getByLabel('Resume Background', { exact: true })).toHaveValue('#faf9f3');
  await panel.getByRole('button', { name: 'Reset to Default', exact: true }).click();
  await expect(panel.getByLabel('Resume Background', { exact: true })).toHaveValue('#ffffff');
  await panel.getByRole('button', { name: 'Resume Background: #eff6ff', exact: true }).click();
  await page.keyboard.press('Escape');
  const previewAfterReload = page.getByRole('button', { name: 'Preview', exact: true });
  if (await previewAfterReload.isVisible()) await previewAfterReload.click();
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  await expect(page.locator('.resume-paper-page-card').first()).toHaveCSS('background-color', 'rgb(239, 246, 255)');
  await page.screenshot({ path: testInfo.outputPath('background-preview.png') });

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const requestPromise = page.waitForRequest(request => request.url().endsWith('/api/export/pdf'));
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export PDF', exact: true }).click();
  const pdfRequest = await requestPromise;
  await (await pdfDownload).saveAs(testInfo.outputPath('background.pdf'));
  const exportPage = await context.newPage();
  await exportPage.setContent(pdfRequest.postDataJSON().html);
  // Sidebar pages use a transparent overlay on the document's paper background.
  await expect(exportPage.locator('.resume-pdf-document')).toHaveCSS('background-color', 'rgb(239, 246, 255)');
  await expect(exportPage.locator('.resume-pdf-page').first()).toHaveCSS('--resume-paper', '#eff6ff');
  await exportPage.close();

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const htmlDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  const htmlPage = await context.newPage();
  await htmlPage.route('**/*', route => route.abort());
  await htmlPage.setContent(await readFile((await (await htmlDownload).path())!, 'utf8'));
  await expect(htmlPage.locator('.resume-paper > .resume-template').first()).toHaveCSS('--resume-paper', '#eff6ff');
  await htmlPage.close();

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const wordDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export Word/ }).click();
  const word = await wordDownload;
  const xml = readZipText(await readFile((await word.path())!), 'word/document.xml');
  expect(xml).toContain('<w:background w:color="eff6ff"');
});

test('changing colors on a long resume preserves the rendered page trees', async ({ page }) => {
  const markdown = `---\nname: 改色性能验证\ntitle: Engineer\n---\n\n## 工作经历\n\n${Array.from({ length: 90 }, (_, i) =>
    `- 记录 ${i}：${'负责端到端测试与版本发布，保证每一行完整显示。'.repeat(5)}`).join('\n')}`;
  await page.addInitScript(({ markdown, data, theme }) => {
    localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'color-performance', name: 'Colors', markdown, data, theme,
      layout: {}, templateId: 'classic', createdAt: 1, updatedAt: 1 }], currentProjectId: 'color-performance' }));
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
  }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: DEFAULT_THEME_CONFIG });
  await page.goto('/');
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  expect(await page.locator('.resume-paper-page-card').count()).toBeGreaterThan(3);
  const panel = await openStyle(page);
  const result = await panel.evaluate(async element => {
    let replacements = 0;
    let measurements = 0;
    const source = document.querySelector<HTMLElement>('.resume-measure')!;
    const getBounds = source.getBoundingClientRect;
    source.getBoundingClientRect = () => { measurements++; return getBounds.call(source); };
    const observer = new MutationObserver(records => { replacements += records.filter(record => record.type === 'childList').length; });
    const roots = [document.querySelector('.resume-measure')!, ...document.querySelectorAll('[data-page-viewport] > div')];
    roots.forEach(root => observer.observe(root, { childList: true, subtree: true }));
    const started = performance.now();
    for (let i = 0; i < 12; i++) {
      const background = i % 2 ? '#eff6ff' : '#faf9f3';
      (element.querySelector(`[aria-label="Resume Background: ${background}"]`) as HTMLButtonElement).click();
      (element.querySelector(`[aria-label="Accent Color: ${i % 2 ? '#26311d' : '#687060'}"]`) as HTMLButtonElement).click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    observer.disconnect();
    source.getBoundingClientRect = getBounds;
    return { replacements, measurements, elapsed: performance.now() - started };
  });
  test.info().annotations.push({ type: 'color-update-duration', description: `${Math.round(result.elapsed)}ms for 12 color pairs` });
  await test.info().attach('color-performance', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.replacements, 'Color-only edits must not rebuild Markdown or page projections').toBe(0);
  expect(result.measurements, 'Color-only edits must not remeasure the pagination source').toBe(0);
  await expect(page.locator('.resume-paper-page-card').first()).toHaveCSS('background-color', 'rgb(239, 246, 255)');
  await expect(page.locator('[data-page-viewport] h2').first()).toHaveCSS('color', 'rgb(38, 49, 29)');
});
