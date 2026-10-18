import { test, expect } from './fixtures';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';

const markdown = '---\nname: Original\ntitle: Engineer\n---\n\n## Experience\n\n### Developer | 2020 - Present\n**Company**\n- Built useful tools.\n\n## Skills\n- React';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ markdown, data, theme }) => {
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
    localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'editing', name: 'Editing', markdown, data, theme,
      templateId: 'classic', layout: {}, createdAt: 1, updatedAt: 1 }], currentProjectId: 'editing' }));
  }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: DEFAULT_THEME_CONFIG });
  await page.goto('/');
});

test('undo restores Markdown focus and the replaced selection', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Resume Markdown' });
  await editor.focus();
  await editor.evaluate((node: HTMLTextAreaElement) => {
    const start = node.value.indexOf('Original');
    node.setSelectionRange(start, start + 'Original'.length);
  });
  await editor.pressSequentially('Replacement');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toHaveValue(markdown);
  await expect(editor).toBeFocused();
  expect(await editor.evaluate((node: HTMLTextAreaElement) => node.value.slice(node.selectionStart, node.selectionEnd))).toBe('Original');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor).toHaveValue(markdown.replace('Original', 'Replacement'));
  await expect(editor).toBeFocused();
});

test('field edits and structural deletion have independent undo steps', async ({ page }) => {
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  const title = page.getByRole('textbox', { name: 'Title', exact: true });
  await name.fill('New name');
  await title.fill('New title');
  await page.getByRole('button', { name: 'Delete section: Skills', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Skills list' })).toBeVisible();
  await expect(title).toHaveValue('New title');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(title).toHaveValue('Engineer');
  await expect(name).toHaveValue('New name');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(name).toHaveValue('Original');
});

test('simulated IME composition delays preview and remains a single undo operation', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Resume Markdown' });
  await editor.dispatchEvent('compositionstart', { data: '' });
  await editor.fill(markdown.replace('Original', '拼'));
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'false');
  await editor.fill(markdown.replace('Original', '拼音'));
  await editor.dispatchEvent('compositionend', { data: '拼音' });
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  await expect(page.locator('.resume-measure h1')).toHaveText('拼音');
  await editor.press('Control+z');
  await expect(editor).toHaveValue(markdown);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('immediate Word export reads the current revision before preview catches up', async ({ page }) => {
  await page.route('**/api/export/docx', route => route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: 'test-export' }));
  const editor = page.getByRole('textbox', { name: 'Resume Markdown' });
  await editor.fill(markdown.replace('Original', 'Latest export'));
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const request = page.waitForRequest('**/api/export/docx');
  await page.getByRole('menuitem', { name: 'Export Word', exact: true }).click();
  expect((await request).postDataJSON().draft.frontmatter.name).toBe('Latest export');
});
