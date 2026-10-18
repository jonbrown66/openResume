import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' })));
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toBeVisible();
});

test('rapid edits are batched and the final keystroke survives immediate reload', async ({ page }, testInfo) => {
  const editor = page.getByRole('textbox', { name: 'Resume Markdown' });
  await editor.fill('# Performance sample\n\n');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('resume_projects')!).projects[0].markdown)).toBe('# Performance sample\n\n');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    const samples: number[] = [];
    Object.assign(window, { resumeSaveSamples: samples });
    Storage.prototype.setItem = function (key, value) {
      if (key === 'resume_projects') samples.push(performance.now());
      return original.call(this, key, value);
    };
  });
  const text = 'Continuous typing keeps the final content.';
  await editor.press('Control+End');
  await editor.pressSequentially(text);
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue(`# Performance sample\n\n${text}`);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('resume_projects')!).projects[0].markdown)).toContain(text);
  const saves = await page.evaluate(() => (window as unknown as { resumeSaveSamples: number[] }).resumeSaveSamples.length);
  expect(saves).toBeLessThan(text.length);
  await testInfo.attach('typing-save-count.json', { body: JSON.stringify({ keystrokes: text.length, storageWrites: saves }), contentType: 'application/json' });
  await editor.pressSequentially('!');
  await page.reload();
  await expect(editor).toHaveValue(`# Performance sample\n\n${text}!`);
});

test('style input, panel dismissal and zoom limits stay usable', async ({ page }, testInfo) => {
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  const more = page.getByRole('button', { name: 'More Actions' });
  if (await more.isVisible()) {
    await more.click();
    await page.getByRole('menuitem', { name: 'Style', exact: true }).click();
  } else await page.getByRole('button', { name: 'Style', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Style Editor' });
  const number = panel.getByRole('spinbutton', { name: 'Font Size (pt)', exact: true });
  await number.fill('');
  await number.pressSequentially('14');
  await expect(number).toHaveValue('14');
  await number.press('Enter');
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
  await expect.poll(() => page.locator('.resume-measure').evaluate(node => node.style.getPropertyValue('--font-size'))).toBe('14pt');
  await number.fill('9');
  await number.press('Escape');
  await expect(number).toHaveValue('14');
  await expect(panel).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('style-input.png') });
  await number.press('Escape');
  await expect(panel).toBeHidden();
  await expect(await more.isVisible() ? more : page.getByRole('button', { name: 'Style', exact: true })).toBeFocused();

  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
  const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
  for (let i = 0; i < 20 && await zoomIn.isEnabled(); i++) await zoomIn.click();
  await expect(zoomIn).toBeDisabled();
  for (let i = 0; i < 20 && await zoomOut.isEnabled(); i++) await zoomOut.click();
  await expect(zoomOut).toBeDisabled();
  await page.getByRole('button', { name: 'Fit canvas' }).click();
  await expect(zoomIn).toBeEnabled();
  await expect(zoomOut).toBeEnabled();
  await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
});

test('reduced motion panels release focus on dismissal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The preference must be active before Framer Motion initializes.
  await page.reload();
  const more = page.getByRole('button', { name: 'More Actions' });
  const trigger = await more.isVisible() ? more : page.getByRole('button', { name: 'Style', exact: true });
  await trigger.click();
  if (await more.isVisible()) await page.getByRole('menuitem', { name: 'Style', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Style Editor' });
  await expect(panel.getByRole('spinbutton', { name: 'Font Size (pt)', exact: true })).toBeVisible();
  await expect(panel).toHaveCSS('opacity', '1');
  await expect(panel).toHaveCSS('transform', 'none');
  await panel.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});
