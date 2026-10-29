import { test, expect } from '@playwright/test';

for (const language of ['zh', 'en']) {
  for (const theme of ['light', 'dark', 'system']) {
    test(`first load and reload hydrate cleanly: ${language}/${theme}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' || /hydration|hydrated|did not match/i.test(message.text())) errors.push(message.text());
      });
      await page.addInitScript(({ language, theme }) => {
        if (!localStorage.getItem('myresume-settings-v1')) {
          localStorage.setItem('myresume-settings-v1', JSON.stringify({ language, theme }));
        }
      }, { language, theme });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      const editor = page.getByRole('textbox', { name: language === 'zh' ? '简历 Markdown' : 'Resume Markdown' });
      await expect(editor).toBeVisible();
      await page.reload();
      await expect(editor).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', language === 'en' ? 'en' : 'zh-CN');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
      await page.getByRole('button', { name: language === 'zh' ? '表单' : 'Form', exact: true }).click();
      await expect(page.getByRole('textbox', { name: language === 'zh' ? '姓名' : 'Name', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

test('saved appearance is applied before React loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ theme: 'light', language: 'en' }));
  });
  // Hold the hydration scripts so the assertion observes the actual first paint.
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, route => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('fresh browser starts without hydration or runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: '简历 Markdown' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: '简历 Markdown' })).toBeVisible();
  expect(errors).toEqual([]);
});
