import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';

async function openSettings(page: Page) {
  const more = page.getByRole('button', { name: 'More Actions' });
  if (await more.isVisible()) {
    await more.click();
    await page.getByRole('menuitem', { name: 'API Settings', exact: true }).click();
  } else await page.getByRole('button', { name: 'API Settings', exact: true }).click();
  return page.getByRole('dialog', { name: 'Settings', exact: true });
}

async function checkMenuGeometry(surface: Locator, item: Locator) {
  await expect(surface).toBeVisible();
  expect(await surface.evaluate(element => ({ radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }))).toEqual({ radius: '12px', padding: '6px' });
  expect(await item.evaluate(element => getComputedStyle(element).borderRadius)).toBe('8px');
  const panel = await surface.boundingBox(); const row = await item.boundingBox();
  expect(row!.x - panel!.x).toBeGreaterThanOrEqual(6);
  // Read layout height: animated transforms can report 35.999992px for a 36px row.
  expect(await item.evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(36);
}

test('secondary menus share inset geometry, labels, selection and dark surfaces', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' })));
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toBeVisible();

  await page.getByTestId('project-selector').click();
  const projects = page.getByRole('group', { name: 'Choose resume' });
  await checkMenuGeometry(projects, projects.locator('[data-project-switch]').first());
  await expect(projects.locator('.ui-project-marker svg')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('projects.png') });
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await checkMenuGeometry(page.getByRole('menu', { name: 'Export', exact: true }), page.getByRole('menuitem', { name: 'Export PDF', exact: true }));
  await page.screenshot({ path: testInfo.outputPath('export.png') });
  await page.keyboard.press('Escape');

  const dialog = await openSettings(page);
  const provider = dialog.getByRole('combobox', { name: 'AI Provider', exact: true });
  await expect(provider).toContainText('Gemini');
  await provider.click();
  const surface = page.locator('[data-slot=select-content]');
  await checkMenuGeometry(surface, page.getByRole('option').first());
  const triggerBounds = await provider.boundingBox(); const popupBounds = await surface.boundingBox();
  expect(popupBounds!.y).toBeGreaterThanOrEqual(triggerBounds!.y + triggerBounds!.height + 6);
  expect(popupBounds!.width).toBeCloseTo(triggerBounds!.width, 0);
  const selected = page.getByRole('option', { selected: true });
  await expect(selected.locator('.ui-menu-check')).toBeVisible();
  expect(await selected.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(await page.getByRole('option').first().evaluate(element => getComputedStyle(element).backgroundColor));
  await page.screenshot({ path: testInfo.outputPath('provider-light.png') });
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await expect(provider).toContainText('OpenRouter');

  const model = dialog.getByRole('combobox', { name: 'Default Model', exact: true });
  await model.click(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await expect(model).toContainText('Custom Model');
  await expect(model).not.toContainText('__custom_model__');
  await page.keyboard.press('Escape');

  const more = page.getByRole('button', { name: 'More Actions' });
  if (await more.isVisible()) {
    await more.click();
    await checkMenuGeometry(page.getByRole('menu', { name: 'More Actions' }), page.getByRole('menuitem', { name: 'Style', exact: true }));
    await page.screenshot({ path: testInfo.outputPath('more.png') });
    await page.getByRole('menuitem', { name: 'Light', exact: true }).click();
  } else await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkDialog = await openSettings(page);
  await darkDialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click();
  await checkMenuGeometry(surface, page.getByRole('option').first());
  await page.screenshot({ path: testInfo.outputPath('provider-dark.png') });
});
