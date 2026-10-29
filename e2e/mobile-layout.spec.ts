import { test, expect } from './fixtures';

for (const lang of ['zh', 'en'] as const) {
  test(`${lang} phone layout preserves editing space and full-width form fields`, async ({ page }) => {
    await page.addInitScript(lang => {
      localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: lang, theme: 'light' }));
    }, lang);
    await page.goto('/');
    const editor = page.getByRole('textbox', { name: lang === 'zh' ? '简历 Markdown' : 'Resume Markdown', exact: true });
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 700 });
      await expect(editor).toBeVisible();
      const toolbar = await page.getByTestId('editor-toolbar').boundingBox();
      const mode = await page.getByRole('button', { name: 'Markdown', exact: true }).boundingBox();
      const tools = await page.getByRole('button', { name: lang === 'zh' ? '编辑工具' : 'Editor tools', exact: true }).boundingBox();
      expect(toolbar!.height).toBeLessThanOrEqual(72);
      expect((await editor.boundingBox())!.y).toBeLessThan(170);
      expect(Math.abs(mode!.y - tools!.y)).toBeLessThan(8);
      expect(tools!.x + tools!.width).toBeLessThanOrEqual(width);
      expect(tools!.width).toBeGreaterThanOrEqual(44);
      expect(tools!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: lang === 'zh' ? '表单' : 'Form', exact: true }).click();
    const basics = page.getByRole('region', { name: lang === 'zh' ? '基本信息' : 'Basic information', exact: true });
    const name = await basics.getByRole('textbox', { name: lang === 'zh' ? '姓名' : 'Name', exact: true }).boundingBox();
    const title = await basics.getByRole('textbox', { name: lang === 'zh' ? '职位' : 'Title', exact: true }).boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(name!.y + name!.height);
    expect(Math.abs(title!.x - name!.x)).toBeLessThan(1);
    expect(name!.width).toBeGreaterThan(380);
    await page.getByRole('button', { name: lang === 'zh' ? '编辑工具' : 'Editor tools', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: lang === 'zh' ? 'Markdown 帮助' : 'Markdown help', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /格式化|Format/ })).toHaveCount(0);
  });
}
