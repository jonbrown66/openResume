import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';

// Observe real pointer-to-frame latency; no hard timing threshold on shared CI hosts.
async function opening(page: Page, trigger: Locator, selector: string) {
  await page.evaluate(selector => {
    const timings = { start: 0, visible: 0, ready: 0 };
    (window as unknown as { openingTimings: typeof timings }).openingTimings = timings;
    document.addEventListener('pointerdown', () => {
      timings.start = performance.now();
      const sample = () => {
        const element = document.querySelector<HTMLElement>(selector);
        if (element?.getBoundingClientRect().height) {
          let opacity = 1;
          for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity);
          if (opacity > 0.05 && !timings.visible) timings.visible = performance.now() - timings.start;
          if (opacity >= 0.99) timings.ready = performance.now() - timings.start;
        }
        if (!timings.ready && performance.now() - timings.start < 20000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { once: true, capture: true });
  }, selector);
  await trigger.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { openingTimings: { ready: number } }).openingTimings.ready), { timeout: 25000 }).toBeGreaterThan(0);
  return page.evaluate(() => (window as unknown as { openingTimings: { visible: number; ready: number } }).openingTimings);
}

test('measure cold and repeated component openings', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.addInitScript(() => localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' })));
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toBeVisible();
  const rows: Array<{ component: string; round: number; visible: number; ready: number }> = [];
  for (const component of ['Settings', 'Style', 'Assistant', 'Export', 'CSS', 'Blocks']) {
    for (let round = 0; round < 3; round++) {
      const more = page.getByRole('button', { name: 'More Actions' });
      if (component === 'CSS' && await page.getByRole('button', { name: 'Preview', exact: true }).isVisible()) await page.getByRole('button', { name: 'Preview', exact: true }).click();
      if (component === 'Blocks' && await page.getByRole('button', { name: 'Edit', exact: true }).isVisible()) await page.getByRole('button', { name: 'Edit', exact: true }).click();
      if (['Settings', 'Style'].includes(component) && await more.isVisible()) await more.click();
      const trigger = component === 'Settings' ? page.getByRole('button', { name: 'AI Settings', exact: true }).or(page.getByRole('menuitem', { name: 'AI Settings', exact: true }))
        : component === 'Style' ? page.getByRole('button', { name: 'Resume style', exact: true }).or(page.getByRole('menuitem', { name: 'Resume style', exact: true }))
        : page.getByRole('button', { name: component === 'Assistant' ? 'Open AI assistant' : component === 'CSS' ? 'Custom CSS' : component === 'Blocks' ? 'Form' : 'Export', exact: true });
      const selector = component === 'Settings' ? '[role=dialog][aria-label=Settings] [role=combobox]'
        : component === 'Style' ? '[role=dialog][aria-label="Resume style"] input[type=range]'
        : component === 'Assistant' ? '[role=dialog][aria-label="Resume Assistant"] textarea'
        : component === 'CSS' ? '[role=dialog][aria-label="Custom CSS"] textarea'
        : component === 'Blocks' ? '[aria-label="Basic information"] input' : '[role=menu] [role=menuitem]';
      const values = await opening(page, trigger, selector);
      rows.push({ component, round, visible: Math.round(values.visible), ready: Math.round(values.ready) });
      if (component === 'Blocks') await page.getByRole('button', { name: 'Markdown', exact: true }).click();
      else await page.keyboard.press('Escape');
      if (component === 'Assistant') await expect(page.getByRole('button', { name: 'Open AI assistant' })).toBeVisible();
      else await expect(page.locator(selector).first()).toBeHidden();
    }
  }
  console.log(`OPEN_TIMINGS ${testInfo.project.name} ${JSON.stringify(rows)}`);
  await testInfo.attach('open-timings.json', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
});
