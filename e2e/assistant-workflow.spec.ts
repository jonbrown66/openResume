import { test, expect } from './fixtures';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';

const markdown = '---\nname: 示例候选人\ntitle: 前端工程师\ncontact: candidate@example.invalid\n---\n\n## 工作经历\n\n### 前端开发 | 2022 - 至今\n**示例公司**\n- 参与管理系统开发，使用 React 完成表单功能。\n\n## 技能\n- React\n- TypeScript';
const revised = markdown.replace('参与管理系统开发，使用 React 完成表单功能。', '使用 React 开发表单模块，完成字段校验和错误状态反馈。');
const response = (content: string) => JSON.stringify({ choices: [{ message: { content } }] });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ markdown, data, theme }) => {
    localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'assistant-demo', name: '示例简历', markdown, data, theme, templateId: 'classic', layout: {}, createdAt: 1, updatedAt: 1 }], currentProjectId: 'assistant-demo' }));
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'zh', theme: 'light', activeProvider: 'openai',
      providers: { openai: { apiKey: 'test-only-key', model: 'test-model', baseUrl: 'https://assistant.invalid/v1' } } }));
  }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: DEFAULT_THEME_CONFIG });
  await page.goto('/');
  await page.getByRole('button', { name: '打开 AI 助手' }).click();
});

test('role matching has editable context and readable Markdown without rewriting', async ({ page }, testInfo) => {
  let sent: { messages: Array<{ content: string }>; response_format?: unknown } | undefined;
  const answer = '## 最值得改进的地方\n\n**先补充你实际交付的范围。** 当前有 React 使用经验，但尚未说明复杂表单的处理方式。\n\n- 原文：“参与管理系统开发”范围较泛。\n- 建议补充字段校验、错误反馈等真实工作。\n\n| 岗位要求 | 简历证据 |\n| --- | --- |\n| React | 管理系统表单开发 |\n| 无障碍 | 暂无明确证据，需要确认 |\n\n### 需要确认\n\n你处理过哪些复杂校验规则？';
  await page.route('https://assistant.invalid/**', async route => {
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: response(answer) });
  });
  await page.getByRole('button', { name: '匹配岗位', exact: true }).click();
  const input = page.locator('[data-assistant-input]');
  await expect(input).toHaveValue(/请结合目标岗位描述/);
  expect(sent).toBeUndefined();
  await page.getByRole('textbox', { name: '目标岗位描述', exact: true }).fill('前端工程师：React、TypeScript、表单设计和无障碍。');
  await page.getByText('目标岗位 / JD（可选）', { exact: true }).click();
  await page.getByRole('button', { name: '发送', exact: true }).click();
  const conversation = page.getByTestId('assistant-conversation');
  await expect(conversation.getByRole('heading', { name: '最值得改进的地方' })).toBeVisible();
  await expect(conversation.getByRole('table')).toHaveText(/React/);
  expect(sent!.messages[1].content).toContain('表单设计和无障碍');
  expect(sent!.response_format).toBeUndefined();
  await expect(page.getByRole('button', { name: '应用到简历' })).toHaveCount(0);
  const dialog = page.getByRole('dialog', { name: '简历助手' });
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('assistant-review.png') });
});

test('candidate comparison stays readable and applies only on request', async ({ page }, testInfo) => {
  await page.route('https://assistant.invalid/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: response(JSON.stringify({
    reply: '## 已调整\n\n- 把笼统描述改为具体动作。\n- 保留职位、公司与任职时间。\n\n请确认字段校验和错误反馈确实属于你的工作。', markdown: revised,
  })) }));
  await page.getByRole('button', { name: '润色经历', exact: true }).click();
  await page.getByRole('button', { name: '发送', exact: true }).click();
  const apply = page.getByRole('button', { name: '应用到简历', exact: true });
  await expect(apply).toBeEnabled();
  await expect(page.getByText('修改前', { exact: true })).toBeVisible();
  await expect(page.getByText('修改后', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看完整对比' }).click();
  await expect(page.getByRole('button', { name: '只看改动' })).toHaveAttribute('aria-expanded', 'true');
  await apply.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('assistant-candidate.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('resume_projects')!).projects[0].markdown);
  expect(saved).toBe(markdown);
  await apply.click();
  await expect(page.getByRole('button', { name: '已应用', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '关闭 AI 助手' }).click();
  await expect(page.getByRole('textbox', { name: '简历 Markdown', exact: true })).toHaveValue(revised);
});

test('failed questions can be retried without duplicate messages', async ({ page }) => {
  let requests = 0;
  await page.route('https://assistant.invalid/**', route => {
    requests++;
    return route.fulfill({ status: requests === 1 ? 503 : 200, contentType: 'application/json',
      body: requests === 1 ? JSON.stringify({ error: { message: 'Test service unavailable' } }) : response('## 已恢复\n\n请补充具体的表单复杂度和交付结果。') });
  });
  await page.locator('[data-assistant-input]').fill('请诊断这份简历');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '简历助手', exact: true }).getByRole('alert')).toContainText('Test service unavailable');
  await expect(page.locator('[data-assistant-input]')).toHaveValue('请诊断这份简历');
  await page.getByRole('button', { name: '重试刚才的问题' }).click();
  await expect(page.getByRole('heading', { name: '已恢复' })).toBeVisible();
  await expect(page.getByTestId('assistant-conversation').getByText('请诊断这份简历', { exact: true })).toHaveCount(1);
  expect(requests).toBe(2);
});

test('stopping a request restores the question and allows sending again', async ({ page }) => {
  let captured = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://assistant.invalid/**', async route => {
    captured = true;
    await gate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: response('Cancelled late reply') }).catch(error => {
      if (!route.request().failure()) throw error;
    });
  });
  await page.locator('[data-assistant-input]').fill('请诊断当前简历');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect.poll(() => captured).toBe(true);
  await page.getByRole('button', { name: '停止', exact: true }).click();
  release();
  await expect(page.locator('[data-assistant-input]')).toHaveValue('请诊断当前简历');
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
  await expect(page.getByText('Cancelled late reply')).toHaveCount(0);
});

test('job context and completed conversation stay attached to their resume project', async ({ page }) => {
  await page.route('https://assistant.invalid/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: response('## 岗位匹配\n\n**结论**：React 经验有直接证据。'),
  }));
  await page.getByRole('button', { name: '匹配岗位', exact: true }).click();
  await page.getByRole('textbox', { name: '目标岗位描述', exact: true }).fill('前端工程师：React、TypeScript、无障碍设计。');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByRole('heading', { name: '岗位匹配' })).toBeVisible();
  await page.getByRole('button', { name: '关闭 AI 助手', exact: true }).click();
  const projectName = page.getByTestId('project-selector');
  await projectName.click();
  await page.getByRole('button', { name: '新建简历', exact: true }).click();
  await page.getByTestId('project-selector').click();
  await page.getByRole('group', { name: '选择简历', exact: true }).getByRole('button', { name: '示例简历', exact: true }).click();
  await page.getByRole('button', { name: '打开 AI 助手' }).click();
  await expect(page.getByRole('textbox', { name: '目标岗位描述', exact: true })).toHaveValue(/无障碍设计/);
  await expect(page.getByRole('heading', { name: '岗位匹配' })).toBeVisible();
});
