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
  await expect(markdown).toHaveValue(/## 技能\n\n- React\n- TypeScript/);
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
  await work.getByRole('button', { name: '上移工作经历', exact: true }).click();
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const ordered = await markdown.inputValue();
  expect(ordered.indexOf('## 工作经历')).toBeLessThan(ordered.indexOf('## 技能'));
  await page.getByRole('button', { name: '区块', exact: true }).click();
  await work.getByRole('button', { name: '删除章节：工作经历', exact: true }).click();
  await expect(work).toHaveCount(0);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(work.locator('fieldset')).toHaveCount(2);
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
