import { test, expect } from './fixtures';

const sample = `---
name: 测试用户
title: 工程师
contact: test@example.com
---

## 教育经历

### 计算机科学 / 本科 | 2020 - 2024
**示例大学**
- 专业课程

## 项目经历

### 简历项目 | 2024
**示例团队**
- 完成开发

## 技能

- React
- TypeScript
`;
async function actOnSection(page: import('@playwright/test').Page, sectionName: string, action: '上移' | '下移' | '删除') {
  const region = page.getByRole('region', { name: sectionName, exact: true });
  const label = action === '删除' ? `删除章节：${sectionName}` : `${action}${sectionName}`;
  const direct = region.getByRole('button', { name: label, exact: true });
  if (await direct.count()) { await direct.click(); return; }
  await region.getByRole('button', { name: `更多章节操作：${sectionName}`, exact: true }).click();
  await page.getByRole('menuitem', { name: action === '删除' ? '删除章节' : `${action}章节`, exact: true }).click();
}

async function actOnEntry(page: import('@playwright/test').Page, sectionName: string, index: number, action: '上移' | '下移' | '删除') {
  const fieldset = page.getByRole('region', { name: sectionName, exact: true }).locator('fieldset').nth(index);
  const direct = fieldset.getByRole('button', { name: `${action}${sectionName}第${index + 1}条`, exact: true });
  if (await direct.count()) { await direct.click(); return; }
  await fieldset.getByRole('button', { name: `更多经历操作：${sectionName}第${index + 1}条`, exact: true }).click();
  await page.getByRole('menuitem', { name: action === '删除' ? '删除经历' : `${action}经历`, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'zh', theme: 'light' })));
  await page.route('**/api/models/catalog?**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/');
  await page.getByRole('textbox', { name: '简历 Markdown', exact: true }).fill(sample);
  await page.getByRole('button', { name: '区块', exact: true }).click();
});

test('beginner section fields and list action map clearly to Markdown and survive reload', async ({ page }) => {
  const toolbarTop = (await page.getByRole('button', { name: 'Markdown', exact: true }).boundingBox())!.y;
  const education = page.getByRole('region', { name: '教育经历', exact: true });
  await expect(education.getByLabel('学校', { exact: true })).toHaveValue('示例大学');
  await expect(education.getByLabel('专业 / 学历', { exact: true })).toHaveValue('计算机科学 / 本科');
  const project = page.getByRole('region', { name: '项目经历', exact: true });
  await expect(project.getByLabel('项目名称', { exact: true })).toHaveValue('简历项目');
  const skills = page.getByRole('region', { name: '技能', exact: true });
  await expect(skills.getByRole('textbox')).toHaveCount(2);
  await expect(skills.getByLabel('时间', { exact: true })).toHaveCount(0);
  await skills.getByLabel('技能清单', { exact: true }).fill('React\nTypeScript');
  expect((await page.getByRole('button', { name: 'Markdown', exact: true }).boundingBox())!.y).toBeCloseTo(toolbarTop, 0);
  await skills.getByRole('button', { name: '技能清单：转为列表', exact: true }).click();
  await expect(skills.getByLabel('技能清单', { exact: true })).toHaveValue('- React\n- TypeScript');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const markdown = page.getByRole('textbox', { name: '简历 Markdown', exact: true });
  await expect(markdown).toHaveValue(/## 技能\n<!-- resume-section-type: skill -->\n\n- React\n- TypeScript/);
  await page.reload();
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await expect(skills.getByLabel('技能清单', { exact: true })).toHaveValue('- React\n- TypeScript');
});

test('unfinished entries retain company and date fields, and section ordering and deletion support undo', async ({ page }) => {
  await page.getByRole('combobox', { name: '添加章节', exact: true }).click();
  await page.getByRole('option', { name: '工作经历', exact: true }).click();
  const work = page.getByRole('region', { name: '工作经历', exact: true });
  await work.getByRole('button', { name: '添加工作经历', exact: true }).click();
  await work.getByLabel('公司', { exact: true }).fill('只填公司的经历');
  await work.getByRole('button', { name: '添加工作经历', exact: true }).click();
  await work.getByLabel('时间', { exact: true }).nth(1).fill('2024 | Remote');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const markdown = page.getByRole('textbox', { name: '简历 Markdown', exact: true });
  await expect(markdown).toHaveValue(/\*\*只填公司的经历\*\*/);
  await markdown.press('Control+End'); await markdown.press('Enter');
  await page.reload();
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await expect(work.locator('fieldset')).toHaveCount(2);
  await expect(work.getByLabel('公司', { exact: true }).first()).toHaveValue('只填公司的经历');
  await expect(work.getByLabel('时间', { exact: true }).nth(1)).toHaveValue('2024 | Remote');
  await actOnSection(page, '工作经历', '上移');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const ordered = await markdown.inputValue();
  expect(ordered.indexOf('## 工作经历')).toBeLessThan(ordered.indexOf('## 技能'));
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await actOnSection(page, '工作经历', '删除');
  await expect(work).toHaveCount(0);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(work.locator('fieldset')).toHaveCount(2);
});

test('folding, simple list sections, inline recovery and renamed forms survive Markdown and reload', async ({ page }, testInfo) => {
  const education = page.getByRole('region', { name: '教育经历', exact: true });
  const summary = education.getByRole('button', { name: '示例大学 · 计算机科学 / 本科 · 2020 - 2024', exact: true });
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await page.screenshot({ path: testInfo.outputPath('before.png') });
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(education.getByLabel('学校', { exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('folded.png') });
  await summary.click();
  await education.getByLabel('章节名称', { exact: true }).fill('我的成长');
  const renamed = page.getByRole('region', { name: '我的成长', exact: true });
  await expect(renamed.getByLabel('学校', { exact: true })).toHaveValue('示例大学');
  const skills = page.getByRole('region', { name: '技能', exact: true });
  await expect(skills.getByLabel('技能清单', { exact: true })).toHaveValue('- React\n- TypeScript');
  await expect(skills.getByRole('button', { name: '添加分组', exact: true })).toHaveCount(0);
  await expect(skills.getByRole('button', { name: '新经历', exact: true })).toHaveCount(0);
  const project = page.getByRole('region', { name: '项目经历', exact: true });
  await actOnEntry(page, '项目经历', 0, '删除');
  await page.getByLabel('姓名', { exact: true }).fill('后续编辑');
  await page.getByRole('button', { name: '撤销删除', exact: true }).click();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('后续编辑');
  await expect(project.locator('fieldset')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('restored.png') });
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(project.locator('fieldset')).toHaveCount(0);
  await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('后续编辑');
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '简历 Markdown', exact: true })).toHaveValue(/## 我的成长\n<!-- resume-section-type: education -->/);
  await page.reload();
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await expect(renamed.getByLabel('学校', { exact: true })).toHaveValue('示例大学');
  await expect(project.locator('fieldset')).toHaveCount(1);
  await expect(page.locator('.resume-measure')).toContainText('示例大学');
  await expect(page.locator('.resume-measure')).not.toContainText('resume-section-type');
  await page.screenshot({ path: testInfo.outputPath('reloaded.png') });
});

test('month picker applies a range, validates order and supports Present without changing cancelled text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const entry = page.getByRole('region', { name: '教育经历', exact: true }).locator('fieldset').first();
  const time = entry.getByRole('textbox', { name: '时间', exact: true });
  const original = await time.inputValue();
  await entry.getByRole('button', { name: '选择日期', exact: true }).click();
  const picker = page.getByRole('dialog', { name: '选择经历时间', exact: true });
  await expect(picker).toBeVisible();
  expect(await picker.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.scrollWidth <= element.clientWidth && rect.left >= 0 && rect.right <= innerWidth && rect.width <= 320 && rect.height <= 360;
  })).toBe(true);
  await picker.getByRole('combobox', { name: '开始年份', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(picker).toBeVisible();
  await picker.getByRole('combobox', { name: '开始年份', exact: true }).click();
  await page.getByRole('option', { name: '2023', exact: true }).click();
  await picker.getByRole('combobox', { name: '开始月份', exact: true }).click();
  await page.getByRole('option', { name: '6月', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(time).toHaveValue(original);
  await entry.getByRole('button', { name: '选择日期', exact: true }).click();
  for (const [part, year, month] of [['开始', '2023', 6], ['结束', '2025', 2]] as const) {
    await picker.getByRole('combobox', { name: `${part}年份`, exact: true }).click();
    await page.getByRole('option', { name: year, exact: true }).click();
    await picker.getByRole('combobox', { name: `${part}月份`, exact: true }).click();
    await page.getByRole('option', { name: `${month}月`, exact: true }).click();
  }
  await picker.getByRole('button', { name: '应用日期', exact: true }).click();
  await expect(time).toHaveValue('2023.06 - 2025.02');
  await entry.getByRole('button', { name: '选择日期', exact: true }).click();
  await picker.getByRole('combobox', { name: '结束年份', exact: true }).click();
  await page.getByRole('option', { name: '2022', exact: true }).click();
  await picker.getByRole('combobox', { name: '结束月份', exact: true }).click();
  await page.getByRole('option', { name: '1月', exact: true }).click();
  await expect(picker.getByRole('status')).toContainText('不能早于');
  await expect(picker.getByRole('button', { name: '应用日期', exact: true })).toBeDisabled();
  await picker.getByRole('checkbox', { name: '至今', exact: true }).check();
  await picker.getByRole('button', { name: '应用日期', exact: true }).click();
  await expect(time).toHaveValue('2023.06 - 至今');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '简历 Markdown', exact: true })).toHaveValue(/2023\.06 - 至今/);
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await time.fill('预计 2027 年毕业');
  await entry.getByRole('button', { name: '选择日期', exact: true }).click();
  await expect(picker.getByText('当前为自定义时间，应用日期后将替换。', { exact: true })).toBeVisible();
  await picker.getByRole('button', { name: '关闭日期选择器', exact: true }).click();
  await expect(time).toHaveValue('预计 2027 年毕业');
  await entry.getByRole('button', { name: '选择日期', exact: true }).click();
  await picker.getByRole('button', { name: '清空', exact: true }).click();
  await expect(time).toHaveValue('');
});

 test('mode switching retains collapsed entries and inline recovery', async ({ page }, testInfo) => {
  const education = page.getByRole('region', { name: '教育经历', exact: true });
  const summary = education.getByRole('button', { name: '示例大学 · 计算机科学 / 本科 · 2020 - 2024', exact: true });
  await summary.click();
  await actOnSection(page, '项目经历', '删除');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: '撤销删除', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '撤销删除', exact: true }).click();
  await expect(page.getByRole('region', { name: '项目经历', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mode-context.png') });
});

test('import defaults to a named new resume, with explicit replacement and compact browser save feedback', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('status').filter({ hasText: '已保存到此浏览器' })).toBeVisible();
  await page.getByRole('button', { name: '导入文件', exact: true }).click();
  await expect(page.getByRole('radio', { name: '导入为新简历（默认）' })).toBeChecked();
  await expect(page.getByRole('radio', { name: /替换当前简历/ })).not.toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('import-320.png') });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '选择文件', exact: true }).click();
  await (await chooser).setFiles({ name: 'Candidate.md', mimeType: 'text/markdown', buffer: Buffer.from(sample.replace('测试用户', '导入用户')) });
  await expect(page.getByTestId('project-selector')).toHaveText('Candidate');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '简历 Markdown', exact: true })).toHaveValue(/name: 导入用户/);
  expect(await page.locator('header').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('imported-320.png') });
  await page.getByRole('button', { name: '导入文件', exact: true }).click();
  await page.getByRole('radio', { name: '替换当前简历「Candidate」', exact: true }).check();
  const replaceChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '选择文件', exact: true }).click();
  await (await replaceChooser).setFiles({ name: 'Replacement.md', mimeType: 'text/markdown', buffer: Buffer.from(sample.replace('测试用户', '替换用户')) });
  await expect(page.getByRole('textbox', { name: '简历 Markdown', exact: true })).toHaveValue(/name: 替换用户/);
  await expect(page.getByTestId('project-selector')).toHaveText('Candidate');
  await page.getByTestId('project-selector').click();
  await page.getByRole('button', { name: '我的简历1', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '简历 Markdown', exact: true })).toHaveValue(/name: 测试用户/);
  await page.screenshot({ path: testInfo.outputPath('original-preserved-320.png') });
});

test('Markdown selection and independent editor scroll survive mode switches', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const editor = page.getByRole('textbox', { name: '简历 Markdown', exact: true });
  await editor.fill(sample + '\n' + '- Additional detail\n'.repeat(100));
  await editor.focus();
  await editor.press('Control+Home');
  await editor.press('Shift+ArrowRight');
  const selection = await editor.evaluate(node => ({ start: (node as HTMLTextAreaElement).selectionStart, end: (node as HTMLTextAreaElement).selectionEnd }));
  await editor.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => editor.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  const scroll = await editor.evaluate(node => node.scrollTop);
  await page.getByRole('button', { name: '区块', exact: true }).click();
  const skills = page.getByRole('region', { name: '技能', exact: true });
  await skills.scrollIntoViewIfNeeded();
  const blockScroll = await skills.evaluate(node => node.parentElement?.parentElement?.scrollTop);
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  expect(await editor.evaluate(node => ({ start: (node as HTMLTextAreaElement).selectionStart, end: (node as HTMLTextAreaElement).selectionEnd }))).toEqual(selection);
  expect(await editor.evaluate(node => node.scrollTop)).toBe(scroll);
  await page.getByRole('button', { name: '区块', exact: true }).click();
  expect(await skills.evaluate(node => node.parentElement?.parentElement?.scrollTop)).toBe(blockScroll);
  await page.screenshot({ path: testInfo.outputPath('independent-scroll.png') });
});
