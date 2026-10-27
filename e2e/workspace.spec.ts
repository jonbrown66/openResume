import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';

const resume = (name: string, lines = 1) => `---\nname: ${name}\ntitle: Engineer\ncontact: audit@example.invalid\n---\n\n## Experience\n\n### Engineer | 2020 - Present\n**Test company**\n${Array.from({ length: lines }, (_, i) => `- Line ${i}: ${'Test resume content. '.repeat(7)}`).join('\n')}`;
async function seed(page: Page) {
  const markdown = resume('Audit A');
  await page.addInitScript(({ markdown, data, theme }) => {
    if (localStorage.getItem('resume_projects')) return;
    localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'audit-a', name: 'Audit A', markdown, data, theme,
      layout: {}, templateId: 'classic', createdAt: 1, updatedAt: 1 }], currentProjectId: 'audit-a' }));
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light', activeProvider: 'openai',
      providers: { openai: { apiKey: 'test-only-key', model: 'test-model', baseUrl: 'https://ai.invalid/v1' } } }));
  }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: DEFAULT_THEME_CONFIG });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toBeVisible();
}
async function preview(page: Page) {
  const button = page.getByRole('button', { name: 'Preview', exact: true });
  if (await button.isVisible()) await button.click();
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
}
test.beforeEach(async ({ page }) => seed(page));

test('block edits persist immediately and survive reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Block saved');
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Updated role');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(/name: Block saved/);
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(/title: Updated role/);
});

test('typing titles keeps focus, all section fields remain editable', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill(
    resume('Audit A').replace('## Experience\n\n', '## Experience\n\nOriginal section introduction.\n\n'));
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  const title = page.getByRole('textbox', { name: 'Section name', exact: true }).first();
  await title.fill(''); await title.pressSequentially('Project XYZ');
  await expect(title).toHaveValue('Project XYZ'); await expect(title).toBeFocused();
  const introduction = page.getByRole('textbox', { name: 'Section introduction', exact: true });
  await expect(introduction).toHaveValue('Original section introduction.');
  await introduction.fill('Leading section content');
  await page.getByRole('textbox', { name: 'Company', exact: true }).fill('Visible organization');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const markdown = page.getByRole('textbox', { name: 'Resume Markdown' });
  await expect(markdown).toHaveValue(/Visible organization/);
  await expect(markdown).toHaveValue(/Leading section content/);
});

test('switching projects isolates undo and preserves the last edit', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Resume Markdown' });
  await editor.fill(resume('A modified'));
  await page.getByTestId('project-selector').click();
  await page.getByRole('button', { name: 'New resume', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await editor.fill(resume('B modified'));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).not.toHaveValue(/A modified/);
  await page.getByTestId('project-selector').click();
  await page.getByRole('button', { name: 'Audit A', exact: true }).click();
  await expect(editor).toHaveValue(/A modified/);
  await editor.press('Control+z');
  await expect(editor).toHaveValue(/A modified/); // The new project's history is empty.
});

test('single-project rename works through the keyboard', async ({ page }) => {
  await page.getByTestId('project-selector').press('Enter');
  await page.getByRole('button', { name: 'Rename: Audit A', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Rename: Audit A', exact: true });
  await input.fill('Renamed resume'); await input.press('Enter');
  await page.getByRole('group', { name: 'Choose resume' }).press('Escape');
  await expect(page.getByTestId('project-selector')).toBeFocused();
  await page.reload(); await expect(page.getByTestId('project-selector')).toContainText('Renamed resume');
});

test('long resume pages do not split lines or multiply their text', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill(resume('Long resume', 90));
  await preview(page);
  await expect.poll(() => page.locator('.resume-paper-page-card').count()).toBeGreaterThan(2);
  // Wait for the measured document and projections to show the final input.
  await expect(page.locator('.resume-measure')).toContainText('Line 89');
  const result = await page.evaluate(() => {
    const crossings: string[] = [];
    for (const viewport of document.querySelectorAll<HTMLElement>('[data-page-viewport]')) {
      const bounds = viewport.getBoundingClientRect();
      const walker = document.createTreeWalker(viewport, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) if (rect.height && (
          (rect.top < bounds.bottom - 0.8 && rect.bottom > bounds.bottom + 0.8) ||
          (rect.top < bounds.top - 0.8 && rect.bottom > bounds.top + 0.8)
        )) crossings.push(walker.currentNode.textContent!);
      }
    }
    // Page projections keep the layout tree intact; count painted items, not hidden copies.
    const items = Array.from(document.querySelectorAll<HTMLElement>('.resume-canvas-screen-preview li')).filter(li => {
      if (getComputedStyle(li).visibility === 'hidden') return false;
      const bounds = li.closest('[data-page-viewport]')!.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(li);
      return Array.from(range.getClientRects()).some(rect => rect.bottom > bounds.top + 0.8 && rect.top < bounds.bottom - 0.8);
    }).length;
    return { crossings, items };
  });
  expect(result.crossings).toEqual([]);
  expect(result.items).toBeLessThan(110);
  await expect(page.locator('.resume-canvas-screen-preview')).toContainText('Line 89');
});

test('narrow-screen actions remain reachable and enlarged canvas can pan', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const checkNavigation = async () => {
    const styles = await page.locator('.ui-edge-nav > button').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { radius: style.borderRadius, shadow: style.boxShadow, topBorder: style.borderTopWidth };
    }));
    expect(styles).toEqual(Array.from({ length: 3 }, () => ({ radius: '0px', shadow: 'none', topBorder: '0px' })));
  };
  await checkNavigation();
  const tab = await page.getByRole('button', { name: 'Markdown', exact: true }).boundingBox();
  const undo = await page.getByRole('button', { name: 'Undo', exact: true }).boundingBox();
  expect(tab!.x + tab!.width).toBeLessThan(undo!.x);
  for (const button of [page.getByTestId('project-selector'), page.getByRole('button', { name: 'More Actions' }), page.getByRole('button', { name: 'Import File', exact: true })]) {
    expect(await button.evaluate(element => { const rect = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); })).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('mobile-editor.png') });
  await preview(page);
  await checkNavigation();
  await page.screenshot({ path: testInfo.outputPath('mobile-preview.png') });
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const scroller = page.getByTestId('preview-scroll');
  expect(await scroller.evaluate(element => { element.scrollLeft = 200; return element.scrollLeft; })).toBeGreaterThan(0);
});

test('header actions remain reachable across phone, tablet and desktop widths', async ({ page }, testInfo) => {
  for (const width of [320, 390, 640, 768, 820, 1024, 1280, 1440, 1536, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    for (const button of [page.getByTestId('project-selector'), page.getByRole('button', { name: 'Import File', exact: true }), page.getByRole('button', { name: 'Export', exact: true })]) {
      await expect.poll(() => button.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth && element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), { message: `Header control is covered or offscreen at ${width}px` }).toBe(true);
    }
    if (width === 768) await page.screenshot({ path: testInfo.outputPath('tablet-header.png') });
  }
});

test('empty import preserves content and Markdown import stays local', async ({ page }) => {
  let calls = 0;
  await page.route('https://ai.invalid/**', route => { calls++; return route.abort(); });
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) });
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(/Audit A/);
  await expect(page.getByText(/No text found/)).toBeVisible();
  const markdown = resume('Imported markdown');
  await input.setInputFiles({ name: 'resume.md', mimeType: 'text/markdown', buffer: Buffer.from(markdown) });
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(markdown);
  expect(calls).toBe(0);
});

test('stale AI proposals cannot overwrite newer edits', async ({ page }) => {
  await page.route('https://ai.invalid/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ reply: 'Proposal ready', markdown: resume('AI proposal') }) } }],
  }) }));
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await page.getByRole('textbox', { name: /Describe how/ }).fill('Rewrite');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply to Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Close AI assistant' }).click();
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill(resume('New manual edit'));
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await expect(page.getByRole('button', { name: 'Outdated proposal' })).toBeDisabled();
  await expect(page.getByText('Your resume has changed. Generate a new candidate from the current content.')).toBeVisible();
  await page.getByRole('button', { name: 'Close AI assistant' }).click();
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(/New manual edit/);
});

test('HTML download is offline and PDF round-trip imports without CDN', async ({ page, request }) => {
  await preview(page);
  const exportButton = page.getByRole('button', { name: 'Export', exact: true });
  await exportButton.click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(path!, 'utf8');
  expect(html).toContain('Content-Security-Policy'); expect(html).toContain('Audit A');
  const response = await request.post('/api/export/pdf', { data: { html: '<html><body><h1>Imported PDF</h1><h2>Experience</h2><p>Test experience content</p></body></html>' } });
  expect(response.status()).toBe(200);
  const bytes = await response.body(); expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  const edit = page.getByRole('button', { name: 'Edit', exact: true }); if (await edit.isVisible()) await edit.click();
  // Force local extraction; no external AI request is needed for this round trip.
  await page.route('https://ai.invalid/**', route => route.abort());
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'audit.pdf', mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(/Test experience content/, { timeout: 20000 });
});

for (const template of ['Minimal', 'Standard', 'Sidebar']) {
  test(`${template} template keeps long content and table rows across pages`, async ({ page }) => {
    await page.getByRole('textbox', { name: 'Resume Markdown' }).fill(resume('Template audit', 55) + '\n\n## Skills\n| Tool | Level |\n| --- | --- |\n| Browser testing | Expert |\n');
    await preview(page); await page.getByRole('button', { name: template, exact: true }).click();
    await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
    await expect(page.locator('.resume-canvas-screen-preview')).toContainText('Line 54');
    await expect(page.locator('.resume-canvas-screen-preview')).toContainText('Browser testing');
    const invisible = await page.evaluate(() => {
      const missing: string[] = [];
      for (let i = 0; i < 55; i++) {
        const marker = `Line ${i}:`;
        const found = Array.from(document.querySelectorAll<HTMLElement>('.resume-canvas-screen-preview li')).some(li => {
          if (!li.textContent?.includes(marker)) return false;
          const bounds = li.closest('[data-page-viewport]')!.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(li);
          return Array.from(range.getClientRects()).some(rect => rect.top >= bounds.top - 0.8 && rect.bottom <= bounds.bottom + 0.8);
        });
        if (!found) missing.push(marker);
      }
      return missing;
    });
    expect(invisible).toEqual([]);
  });
}

test('Chinese exports embed local font subsets and produce a readable PDF', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill('---\nname: 测试候选人\ntitle: 软件工程师\n---\n\n## 工作经历\n- 完成浏览器测试和中文简历导出。');
  await preview(page); await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export PDF', exact: true }).click();
  const download = await downloadPromise; const path = await download.path();
  const { readFile } = await import('node:fs/promises'); const bytes = await readFile(path!);
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  expect(bytes.length).toBeGreaterThan(10000);
  const edit = page.getByRole('button', { name: 'Edit', exact: true }); if (await edit.isVisible()) await edit.click();
  await page.route('https://ai.invalid/**', route => route.abort());
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'chinese.pdf', mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toHaveValue(/中文简历导出/, { timeout: 20000 });
});
