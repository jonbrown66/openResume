import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';

const markdown = '---\nname: 字体验证 Font Test\ntitle: 工程师 Engineer\n---\n\n## 工作经历 Experience\n\n正文内容 Regular sample.\n\n**中文粗体 Bold sample**';
async function seed(page: Page, fontFamily = 'Geist', waitForFonts = true) {
  await page.addInitScript(({ markdown, data, theme }) => {
    localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'fonts', name: 'Font test', markdown, data, theme,
      layout: {}, templateId: 'classic', createdAt: 1, updatedAt: 1 }], currentProjectId: 'fonts' }));
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
  }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: { ...DEFAULT_THEME_CONFIG, fontFamily } });
  await page.goto('/');
  if (waitForFonts) await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true', { timeout: 20000 });
}
async function style(page: Page) {
  const more = page.getByRole('button', { name: 'More Actions', exact: true });
  if (await more.isVisible()) { await more.click(); await page.getByRole('menuitem', { name: 'Style', exact: true }).click(); }
  else await page.getByRole('button', { name: 'Style', exact: true }).click();
  return page.getByRole('dialog', { name: 'Style Editor' });
}

test('style defaults match the requested values and Minimal headings keep their hierarchy', async ({ page }) => {
  await seed(page);
  const panel = await style(page);
  for (const [name, value] of [['Font Size (pt)', '11'], ['Line Height (value)', '1.4'], ['Section Spacing (px)', '20'], ['Page Margin (mm)', '12']]) {
    await expect(panel.getByRole('spinbutton', { name, exact: true })).toHaveValue(value);
  }
  await expect(panel.getByText(/Loaded on demand|Word recipients/)).toHaveCount(0);
  await expect(panel.getByRole('status')).toHaveCount(0);
  await panel.getByRole('combobox').click();
  await expect(page.locator('[role="option"][aria-disabled="true"]')).toHaveCount(0);
  await expect(page.getByRole('option', { name: /Unavailable|不可用/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await panel.getByRole('spinbutton', { name: 'Font Size (pt)', exact: true }).fill('13');
  await panel.getByRole('button', { name: 'Reset to Default', exact: true }).click();
  await expect(panel.getByRole('spinbutton', { name: 'Font Size (pt)', exact: true })).toHaveValue('11');
  await page.keyboard.press('Escape');
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  await page.getByRole('button', { name: 'Minimal', exact: true }).click();
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  const ratio = await page.locator('.resume-measure .resume-content').evaluate(element => {
    const heading = parseFloat(getComputedStyle(element.querySelector('h2')!).fontSize);
    const body = parseFloat(getComputedStyle(element.querySelector('p')!).fontSize);
    return heading / body;
  });
  expect(ratio).toBeGreaterThan(1.15);
  await page.screenshot({ path: test.info().outputPath('minimal-heading.png') });
});

test('all six built-ins render real web fonts with Chinese and bold glyphs', async ({ page, context }) => {
  const initialFontRequests: string[] = [];
  page.on('request', request => { if (/\.woff2?(?:$|\?)/.test(request.url())) initialFontRequests.push(request.url()); });
  await seed(page);
  expect(initialFontRequests.some(url => /noto-serif|noto-sans-mono/.test(url))).toBe(false);
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const panel = await style(page);
  for (const [label, actual, chinese] of [
    ['Noto Sans SC', 'Noto Sans SC', 'Noto Sans SC'], ['Noto Serif SC', 'Noto Serif SC', 'Noto Serif SC'],
    ['Noto Sans', 'Noto Sans', 'Noto Sans SC'], ['Noto Serif', 'Noto Serif', 'Noto Serif SC'],
    ['Noto Sans Mono', 'Noto Sans Mono', 'Noto Sans SC'], ['Geist', 'Geist', 'Noto Sans SC'],
  ]) {
    await panel.getByRole('combobox').click(); await page.getByRole('option', { name: label, exact: true }).click();
    await expect(panel.getByRole('combobox')).toContainText(label, { timeout: 15000 });
    await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
    const root = await cdp.send('DOM.getDocument');
    for (const selector of ['.resume-measure .resume-content p', '.resume-measure .resume-content strong']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.root.nodeId, selector });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(fonts.some(font => font.isCustomFont && font.glyphCount > 0 && font.familyName.includes(actual)), `${label}: Latin glyphs ${JSON.stringify(fonts)}`).toBe(true);
      expect(fonts.some(font => font.isCustomFont && font.glyphCount > 0 && font.familyName.includes(chinese)), `${label}: Chinese glyphs ${JSON.stringify(fonts)}`).toBe(true);
    }
  }
  await page.screenshot({ path: test.info().outputPath('font-panel.png'), fullPage: true });
});

test('unavailable saved local fonts show a recoverable preview and an explicit export message', async ({ page }) => {
  await seed(page, 'Missing Font For Test', false);
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  await expect(page.locator('.resume-canvas-screen-preview').getByRole('alert')).toContainText('Font loading failed');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  await expect(page.getByText(/Local fonts cannot be embedded/)).toBeVisible();
  const panel = await style(page);
  await panel.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Geist', exact: true }).click();
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  await expect(page.getByText('Font loading failed. Showing a fallback preview.', { exact: false })).toBeHidden();
});

test('legacy serif choice exports embedded fonts and reopens without network fonts', async ({ page, context }) => {
  await seed(page, 'Source Han Serif SC');
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  const file = await downloading;
  const html = await readFile((await file.path())!, 'utf8');
  expect(html).toMatch(/Noto Serif SC/); expect(html).toMatch(/data:font\/woff2;base64/);
  expect(html).not.toMatch(/url\(["']?[^)]*\/_next\/static\/media/);
  const offline = await context.newPage();
  await offline.route('**/*', route => route.abort());
  await offline.setContent(html);
  await offline.evaluate(() => document.fonts.ready);
  const cdp = await context.newCDPSession(offline); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const root = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.root.nodeId, selector: '.resume-content p' });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.every(font => font.isCustomFont && font.familyName.includes('Noto Serif SC'))).toBe(true);
  expect(fonts.length).toBeGreaterThan(0);
  await offline.close();
});

test('failed font requests keep the current choice and allow a retry', async ({ page }) => {
  await seed(page);
  const panel = await style(page);
  await page.route('**/*noto-serif-sc*.woff*', route => route.abort());
  await panel.getByRole('combobox').click(); await page.getByRole('option', { name: 'Noto Serif SC', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Font loading failed', { timeout: 15000 });
  await expect(panel.getByRole('combobox')).toContainText('Geist');
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  await page.unroute('**/*noto-serif-sc*.woff*');
  await panel.getByRole('combobox').click(); await page.getByRole('option', { name: 'Noto Serif SC', exact: true }).click();
  await expect(panel.getByRole('combobox')).toContainText('Noto Serif SC', { timeout: 15000 });
});
