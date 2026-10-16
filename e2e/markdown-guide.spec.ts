import { test, expect } from './fixtures';

for (const lang of ['zh', 'en'] as const) {
  test(`${lang} Markdown guide copies a usable example without editing the resume and offers block mode`, async ({ page }) => {
    await page.addInitScript(({ lang }) => {
      localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: lang, theme: 'light' }));
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (text: string) => { (window as unknown as { copiedGuide: string }).copiedGuide = text; },
      } });
    }, { lang });
    await page.route('**/api/models/catalog?**', route => route.fulfill({ status: 503, json: {} }));
    await page.goto('/');
    const editor = page.getByRole('textbox', { name: lang === 'zh' ? '简历 Markdown' : 'Resume Markdown', exact: true });
    const original = await editor.inputValue();
    const trigger = page.getByRole('button', { name: lang === 'zh' ? 'Markdown 写法与样式' : 'Markdown guide', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: lang === 'zh' ? 'Markdown 写法与样式' : 'Markdown guide', exact: true });
    await expect(dialog.getByRole('table')).toBeVisible();
    await expect(dialog.getByText(lang === 'zh' ? '公司或学校名称' : 'Company or school', { exact: true })).toBeVisible();
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: lang === 'zh' ? '复制完整示例' : 'Copy full example', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(lang === 'zh' ? '已复制' : 'Copied');
    const copied = await page.evaluate(() => (window as unknown as { copiedGuide: string }).copiedGuide);
    expect(copied).toContain(lang === 'zh' ? 'name: 张三' : 'name: Alex Chen');
    expect(copied).toContain('**30%**');
    await expect(editor).toHaveValue(original);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(editor).toHaveValue(original);
    // The short, narrow view must keep the footer usable and toolbar buttons separate.
    await page.setViewportSize({ width: 320, height: 568 });
    await trigger.click();
    const useBlocks = dialog.getByRole('button', { name: lang === 'zh' ? '改用区块填写' : 'Use block editor', exact: true });
    await expect(useBlocks).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath('markdown-guide.png') });
    await useBlocks.click();
    await expect(dialog).toBeHidden();
    await expect(editor).toBeHidden();
    await page.getByRole('button', { name: 'Markdown', exact: true }).click();
    await expect(editor).toHaveValue(original);
    const helpBox = await trigger.boundingBox();
    const tabBox = await page.getByRole('button', { name: 'Markdown', exact: true }).boundingBox();
    expect(helpBox!.y >= tabBox!.y + tabBox!.height || helpBox!.x >= tabBox!.x + tabBox!.width).toBe(true);
  });
}
