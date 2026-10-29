import type { Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';

const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,OPTIONS' };
const providerIds = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter'];
test.beforeEach(async ({ page }) => {
  await page.route('**/api/models/catalog?provider=all&refresh=1', route => route.fulfill({ json: {
    catalogs: Object.fromEntries(providerIds.map(id => [id, { models: [`${id}-public-1`], updatedAt: Date.now(), source: 'public' }])),
  } }));
});
async function respond(route: Route, models: string[], status = 200) {
  await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify({ data: models.map(id => ({ id })) }) });
}
async function enter(page: Page, apiKey = 'catalog-test-only-key-a') {
  await page.addInitScript(({ apiKey }) => {
    if (localStorage.getItem('myresume-settings-v1')) return;
    localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light', activeProvider: 'openai', providers: {
      openai: { apiKey, baseUrl: 'https://models-a.example/v1', model: 'old-selected-model' },
    } }));
  }, { apiKey });
  await page.goto('/');
}
async function openSettings(page: Page) {
  const more = page.getByRole('button', { name: 'More Actions', exact: true });
  if (await more.isVisible()) { await more.click(); await page.getByRole('menuitem', { name: 'AI Settings', exact: true }).click(); }
  else await page.getByRole('button', { name: 'AI Settings', exact: true }).click();
  return page.getByRole('dialog', { name: 'Settings', exact: true });
}
async function expectModel(page: Page, id: string) {
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(dialog.getByRole('button', { name: 'Refresh models', exact: true })).toBeEnabled();
  await dialog.getByRole('combobox', { name: 'Default Model', exact: true }).click();
  await expect(page.getByRole('option', { name: id, exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
}
async function enterAccount(page: Page) {
  await enter(page);
  const dialog = await openSettings(page);
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Refresh models', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('manual account refresh preserves selection and removes success/source copy', async ({ page }) => {
  let calls = 0;
  await page.route('https://models-a.example/**', async route => {
    expect(route.request().url()).toBe('https://models-a.example/v1/models');
    expect(route.request().method()).toBe('GET'); calls++;
    await respond(route, ['future-chat-a', 'future-chat-b']);
  });
  await enterAccount(page);
  await expect.poll(() => calls).toBe(1);
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  const dialog = await openSettings(page);
  await expectModel(page, 'future-chat-b');
  const select = dialog.getByRole('combobox', { name: 'Default Model', exact: true });
  await expect(select).toContainText('old-selected-model');
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await expect(dialog.getByText(/Synced|Public catalog|Source: models.dev/)).toHaveCount(0);
  await select.click(); await page.getByRole('option', { name: 'future-chat-b', exact: true }).click();
  await expect(select).toContainText('future-chat-b');
  expect(calls).toBe(1);
  const cached = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('myresume-model-catalog-v1:')).map(key => [key, localStorage.getItem(key)]));
  expect(cached.length).toBeGreaterThanOrEqual(1); expect(JSON.stringify(cached)).not.toContain('catalog-test-only-key');
  await page.screenshot({ path: test.info().outputPath('clean-model-settings.png') });
});

test('focus, elapsed time, panel reopen and credential edits never auto-refresh', async ({ page }) => {
  let calls = 0;
  await page.route('https://models-a.example/**', async route => { calls++; await respond(route, ['entry-model']); });
  await enterAccount(page); await expect.poll(() => calls).toBe(1);
  let dialog = await openSettings(page); await expectModel(page, 'entry-model');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  dialog = await openSettings(page);
  await expectModel(page, 'entry-model');
  await dialog.getByRole('textbox', { name: 'API Key', exact: true }).fill('changed-test-only-key');
  expect(calls).toBe(1);
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click();
  await expect.poll(() => calls).toBe(2);
  await expectModel(page, 'entry-model');
  await page.reload();
  dialog = await openSettings(page); await expectModel(page, 'entry-model');
  await dialog.getByRole('textbox', { name: 'API Key', exact: true }).fill('another-test-only-key');
  // Advance timers after UI interactions so Framer exit animations retain a normal clock.
  await page.clock.install();
  await page.clock.fastForward(25 * 60 * 60 * 1000);
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(120000);
  expect(calls).toBe(2);
});

test('manual refresh adds releases, keeps the previous list on failure and retries', async ({ page }) => {
  let generation = 1; let fail = false;
  await page.route('https://models-a.example/v1/models', route => respond(route, [`future-chat-${generation}`], fail ? 503 : 200));
  await enterAccount(page); const dialog = await openSettings(page); await expectModel(page, 'future-chat-1');
  generation = 2;
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'future-chat-2');
  fail = true;
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Previous list kept'); await expectModel(page, 'future-chat-2');
  fail = false; generation = 3;
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'future-chat-3');
});

test('manual requests for another endpoint/account cannot be overwritten by an old response', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let started = false;
  await page.route('https://models-a.example/v1/models', async route => { started = true; await gate; await respond(route, ['stale-model-a']).catch(() => {}); });
  let callsB = 0;
  await page.route('https://models-b.example/v1/models', async route => { callsB++; await respond(route, [route.request().headers().authorization?.includes('key-b') ? 'account-b-model' : 'endpoint-b-model']); });
  await enter(page);
  const dialog = await openSettings(page);
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await dialog.getByRole('textbox', { name: 'API Endpoint', exact: true }).fill('https://models-b.example/v1');
  expect(callsB).toBe(0);
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'endpoint-b-model');
  release();
  await dialog.getByRole('textbox', { name: 'API Key', exact: true }).fill('catalog-test-only-key-b');
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'account-b-model');
  await dialog.getByRole('combobox', { name: 'Default Model', exact: true }).click();
  await expect(page.getByRole('option', { name: /stale-model-a|endpoint-b-model/ })).toHaveCount(0);
});

test('unsupported catalogs still permit manual model entry and retries', async ({ page }) => {
  await page.route('https://models-a.example/v1/models', route => respond(route, [], 404));
  await enterAccount(page); const dialog = await openSettings(page);
  await expect(dialog.getByRole('status')).toContainText('cannot list models');
  await dialog.getByRole('combobox', { name: 'Default Model', exact: true }).click();
  await page.getByRole('option', { name: /Custom Model/i }).click();
  const custom = dialog.getByRole('textbox', { name: 'Enter a custom model name...', exact: true });
  await custom.fill('manually-configured-model'); await expect(custom).toHaveValue('manually-configured-model');
  await expect(dialog.getByRole('button', { name: 'Refresh models', exact: true })).toBeEnabled();
});

test('entry fetches all five publicly once, switching needs no requests, and account results stay isolated', async ({ page }) => {
  let generation = 1; let publicCalls = 0; let accountCalls = 0;
  await page.route('**/api/models/catalog?**', async route => {
    publicCalls++;
    expect(route.request().headers().authorization).toBeUndefined();
    const provider = new URL(route.request().url()).searchParams.get('provider');
    await route.fulfill({ json: provider === 'all' ? {
      catalogs: Object.fromEntries(providerIds.map(id => [id, { models: [`${id}-public-${generation}`], source: 'public', updatedAt: Date.now() }])),
    } : { models: [`${provider}-public-${generation}`], source: 'public', updatedAt: Date.now() } });
  });
  await page.route('https://models-a.example/**', async route => { accountCalls++; await respond(route, ['account-only-model']); });
  await enter(page, ''); await expect.poll(() => publicCalls).toBe(1);
  const dialog = await openSettings(page); await expectModel(page, 'openai-public-1');
  await expect(dialog.getByText(/Synced|Public catalog|Source: models.dev/)).toHaveCount(0);
  for (const [id, label] of [['anthropic', 'Anthropic'], ['gemini', 'Gemini'], ['deepseek', 'DeepSeek'], ['openrouter', 'OpenRouter']]) {
    const before = publicCalls;
    await dialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click(); await page.getByRole('option', { name: label, exact: true }).click();
    expect(publicCalls).toBe(before);
    await expectModel(page, `${id}-public-1`);
  }
  expect(publicCalls).toBe(1); expect(accountCalls).toBe(0); generation = 2;
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'openrouter-public-2');
  await dialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click(); await page.getByRole('option', { name: 'OpenAI', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'API Key', exact: true }).fill('test-only-account-key');
  expect(accountCalls).toBe(0);
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'account-only-model');
  expect(publicCalls).toBe(2); expect(accountCalls).toBe(1);
});

test('late entry batch cannot overwrite manual results and failed reload keeps cached lists', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let fail = false; let started = false; let accountCalls = 0;
  await page.route('**/api/models/catalog?provider=all&refresh=1', async route => {
    started = true;
    if (fail) { await route.fulfill({ status: 503, json: { error: 'Unavailable' } }); return; }
    await gate;
    await route.fulfill({ json: { catalogs: Object.fromEntries(providerIds.map(id => [id, {
      models: [`${id}-entry-old`], source: 'public', updatedAt: Date.now(),
    }])) } });
  });
  await page.route('**/api/models/catalog?provider=openai&refresh=1', route => route.fulfill({ json: {
    models: ['manual-new'], source: 'public', updatedAt: Date.now(),
  } }));
  await page.route('https://models-a.example/**', async route => { accountCalls++; await respond(route, ['account-model']); });
  await enter(page); await expect.poll(() => started).toBe(true);
  const dialog = await openSettings(page);
  expect(accountCalls).toBe(0);
  await dialog.getByRole('textbox', { name: 'API Key', exact: true }).fill('');
  await dialog.getByRole('button', { name: 'Refresh models', exact: true }).click(); await expectModel(page, 'manual-new');
  release();
  await dialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click();
  await page.getByRole('option', { name: 'Gemini', exact: true }).click(); await expectModel(page, 'gemini-entry-old');
  await dialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click();
  await page.getByRole('option', { name: 'OpenAI', exact: true }).click(); await expectModel(page, 'manual-new');
  fail = true; await page.reload(); await openSettings(page); await expectModel(page, 'manual-new');
  expect(accountCalls).toBe(0);
});
