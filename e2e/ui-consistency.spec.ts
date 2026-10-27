import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' })));
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Resume Markdown' })).toBeVisible();
});

async function settings(page: Page) {
  const more = page.getByRole('button', { name: 'More Actions' });
  if (await more.isVisible()) {
    await more.click();
    await page.getByRole('menuitem', { name: 'API Settings', exact: true }).click();
  } else await page.getByRole('button', { name: 'API Settings', exact: true }).click();
  return page.getByRole('dialog', { name: 'Settings', exact: true });
}

test('markdown editor fills the pane without rounded focus borders or nested scrolling', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Resume Markdown', exact: true });
  await editor.click();
  const layout = await editor.evaluate(element => {
    const input = element as HTMLTextAreaElement;
    const container = input.parentElement!;
    const style = getComputedStyle(input);
    return { radius: style.borderRadius, outline: style.outlineColor, border: style.borderWidth,
      paddingTop: parseFloat(getComputedStyle(container).paddingTop),
      outerOverflow: container.scrollHeight - container.clientHeight,
      heightGap: Math.abs(input.getBoundingClientRect().height - container.clientHeight),
      scrollable: input.scrollHeight > input.clientHeight };
  });
  expect(layout.radius).toBe('0px');
  expect(layout.border).toBe('0px');
  expect(layout.outline).toBe('rgba(0, 0, 0, 0)');
  expect(layout.paddingTop).toBe(0);
  expect(layout.outerOverflow).toBeLessThanOrEqual(1);
  expect(layout.heightGap).toBeLessThanOrEqual(1);
  expect(layout.scrollable).toBe(true);
  await editor.press('Control+End');
  await expect.poll(() => editor.evaluate(element => {
    const input = element as HTMLTextAreaElement;
    const style = getComputedStyle(input);
    // Caret navigation reveals the final line, without necessarily consuming bottom padding.
    return input.selectionEnd === input.value.length && input.scrollTop > 0
      && input.scrollHeight - input.clientHeight - input.scrollTop <= parseFloat(style.paddingBottom) + parseFloat(style.lineHeight);
  })).toBe(true);
});

test('assistant composer has one outer focus border and no inner textarea frame', async ({ page }) => {
  await page.getByRole('button', { name: 'Open AI assistant', exact: true }).click();
  const input = page.locator('.ui-composer textarea');
  await input.fill('Polish my resume');
  await expect(input).toBeFocused();
  const style = await input.evaluate(element => {
    const inner = getComputedStyle(element);
    const outer = getComputedStyle(element.parentElement!);
    return { outline: inner.outlineColor, border: inner.borderWidth, radius: inner.borderRadius,
      display: inner.display, outerBorder: outer.borderWidth };
  });
  expect(style.outline).toBe('rgba(0, 0, 0, 0)');
  expect(style.border).toBe('0px');
  expect(style.radius).toBe('0px');
  expect(style.display).toBe('block');
  expect(style.outerBorder).toBe('1px');
  await expect(page.locator('.ui-composer').getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
});

test('short-screen settings scroll, stay above tools and restore keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 568 });
  const dialog = await settings(page);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect.poll(() => page.locator('main').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  const connection = dialog.getByRole('button', { name: 'Test Connection', exact: true });
  // A catalog response can add model guidance after the first scroll.
  // Recheck reachability after that layout change without relaxing the geometry.
  await expect.poll(async () => {
    await connection.scrollIntoViewIfNeeded();
    return connection.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight && element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    });
  }).toBe(true);
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'More Actions' })).toBeFocused();
  expect(await page.locator('main').evaluate(element => (element as HTMLElement).inert)).toBe(false);
});

test('nested Select handles Escape before its settings dialog', async ({ page }) => {
  const dialog = await settings(page);
  await dialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('settings and font Select options are above their panels and clickable', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 568 });
  const dialog = await settings(page);
  for (const name of ['AI Provider', 'Default Model']) {
    await dialog.getByRole('combobox', { name, exact: true }).click();
    const option = page.getByRole('option').first();
    await option.scrollIntoViewIfNeeded();
    await expect.poll(() => option.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    }), { message: `${name} option is covered by another layer` }).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${name.replaceAll(' ', '-')}-dropdown.png`) });
    await option.click();
    await expect(page.getByRole('listbox')).toBeHidden();
  }
  await page.keyboard.press('Escape');
  const more = page.getByRole('button', { name: 'More Actions' });
  if (await more.isVisible()) {
    await more.click(); await page.getByRole('menuitem', { name: 'Style', exact: true }).click();
  } else await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByRole('dialog', { name: 'Style Editor' }).getByRole('combobox').click();
  const font = page.getByRole('option').first();
  await font.scrollIntoViewIfNeeded();
  await expect.poll(() => font.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  }), { message: 'Font option is covered by its panel' }).toBe(true);
  const lastFont = page.locator('[role="option"]:not([aria-disabled="true"])').last();
  await lastFont.scrollIntoViewIfNeeded();
  await expect.poll(() => lastFont.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= innerHeight && element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  }), { message: 'Last font remains reachable near the viewport edge' }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('font-dropdown.png') });
  await lastFont.click();
  await expect(page.getByRole('listbox')).toBeHidden();
});

test('assistant sheet owns focus, permits settings Select and returns to launcher', async ({ page }) => {
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  const dialog = page.getByRole('dialog', { name: 'Resume Assistant' });
  await expect(dialog).toHaveAttribute('aria-modal', String(page.viewportSize()!.width < 640));
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await dialog.getByRole('button', { name: 'Configure', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'AI Provider', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toBeFocused();
});

test('add section label stays complete and its options remain reachable', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  for (const width of [320, 390, 810, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    const picker = page.getByRole('combobox', { name: 'Add section', exact: true });
    await expect(picker).toBeVisible();
    const layout = await picker.evaluate(button => {
      const label = button.querySelector<HTMLElement>('[data-slot=select-value]')!;
      const bounds = button.getBoundingClientRect();
      const text = label.getBoundingClientRect();
      return { clipped: label.scrollWidth > label.clientWidth,
        inside: bounds.left >= 0 && bounds.right <= innerWidth && text.left >= bounds.left && text.right <= bounds.right };
    });
    expect(layout).toEqual({ clipped: false, inside: true });
    await picker.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    for (const option of await page.getByRole('option').all()) {
      expect(await option.evaluate(element => {
        const text = element.querySelector<HTMLElement>('.ui-select-item-text')!;
        return text.scrollWidth <= text.clientWidth;
      }), 'Section names must remain readable in the menu').toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`add-section-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(picker).toBeFocused();
  }
});

test('style controls have names and touch-sized targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'More Actions' }).click();
  await page.getByRole('menuitem', { name: 'Style', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Style Editor' });
  await expect(dialog).toBeVisible();
  const swatch = dialog.locator('[data-color-swatch]').first();
  await expect(swatch).toHaveAttribute('aria-label', /#[0-9a-f]{6}/);
  // Layout dimensions avoid subpixel noise from the panel's transform animation.
  const bounds = await swatch.evaluate(element => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
  expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
  await expect(dialog.getByRole('slider', { name: 'Font Size', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('style sliders keep their label and unit aligned on a narrow panel', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 568 });
  const more = page.getByRole('button', { name: 'More Actions' });
  if (await more.isVisible()) {
    await more.click(); await page.getByRole('menuitem', { name: 'Style', exact: true }).click();
  } else await page.getByRole('button', { name: 'Style', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Style Editor' });
  await expect(dialog.getByText('Secondary Color', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('Accent Color', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Primary Color', { exact: true })).toHaveCount(0);
  const margin = dialog.getByRole('slider', { name: 'Page Margin', exact: true });
  const number = dialog.getByRole('spinbutton', { name: 'Page Margin (mm)', exact: true });
  await number.fill('24');
  await number.press('Enter');
  await expect(margin).toHaveValue('24');
  await margin.focus(); await page.keyboard.press('Home');
  await expect(number).toHaveValue('10');
  await page.keyboard.press('End');
  await expect(number).toHaveValue('30');
  await number.fill('20');
  await number.press('Enter');
  await margin.scrollIntoViewIfNeeded();
  const geometry = await margin.evaluate(element => {
    const control = element.closest('.ui-slider-control')!;
    const label = control.querySelector('.ui-slider-label')!.getBoundingClientRect();
    const range = element.getBoundingClientRect();
    const value = control.querySelector('.ui-slider-value')!.getBoundingClientRect();
    const unit = control.querySelector('.ui-slider-value > span')!.getBoundingClientRect();
    return { labelBeside: label.right <= range.left && label.top < range.bottom && label.bottom > range.top, gap: value.left - range.right, unitInside: unit.left >= value.left && unit.right <= value.right, inside: value.right <= innerWidth, appearance: getComputedStyle(element).appearance };
  });
  expect(geometry).toMatchObject({ labelBeside: true, unitInside: true, inside: true, appearance: 'none' });
  expect(geometry.gap).toBeGreaterThanOrEqual(12);
  const reset = dialog.getByRole('button', { name: 'Reset to Default', exact: true });
  await expect(reset).toBeInViewport();
  expect(await number.evaluate(element => {
    const footer = element.closest('[role=dialog]')!.querySelector('.ui-panel-footer')!;
    return footer.getBoundingClientRect().top - element.getBoundingClientRect().bottom;
  }), 'Footer separator must clear the number field and its focus outline').toBeGreaterThanOrEqual(12);
  expect(await reset.evaluate(element => {
    const lastControl = element.closest('[role=dialog]')!.querySelector('.ui-slider-control:last-child')!;
    return element.getBoundingClientRect().top - lastControl.getBoundingClientRect().bottom;
  }), 'Reset action must be separated from the final slider and focus ring').toBeGreaterThanOrEqual(24);
  await page.screenshot({ path: testInfo.outputPath('style-sliders.png') });
});

test('export menu supports arrows and retains its trigger dimensions during download', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Export', exact: true });
  await expect(trigger).toBeEnabled();
  const before = await trigger.boundingBox();
  await trigger.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Export PDF', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Export HTML', exact: true })).toBeFocused();
  const download = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  await download;
  const after = await trigger.boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 0); expect(after!.height).toBeCloseTo(before!.height, 0);
});

test('UI radii, highlights and surfaces stay coherent in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const trigger = page.getByRole('button', { name: 'Export', exact: true });
  const tab = page.getByRole('button', { name: 'Markdown', exact: true });
  const geometry = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('header button')].filter(element => element.getBoundingClientRect().height);
    return buttons.map(element => ({ radius: getComputedStyle(element).borderRadius, shadow: getComputedStyle(element).boxShadow }));
  });
  expect(new Set(geometry.map(item => item.radius)).size).toBe(1);
  expect(geometry.every(item => item.shadow === 'none')).toBe(true);
  expect(await trigger.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(await tab.evaluate(element => getComputedStyle(element).backgroundColor));
  await page.screenshot({ path: testInfo.outputPath('workbench-light.png') });
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('workbench-dark.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('workbench-mobile.png') });
});

test('long unbroken resume text wraps inside the paper instead of being clipped', async ({ page }, testInfo) => {
  const token = 'W'.repeat(70);
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill(
    `---\nname: ${token}\ntitle: Senior Engineer\ncontact: https://example.com/${'a'.repeat(110)}\n---\n\n## Skills\n\n- ${'X'.repeat(110)}\n`);
  const preview = page.getByRole('button', { name: 'Preview', exact: true });
  if (await preview.isVisible()) await preview.click();
  for (const template of ['Classic', 'Minimal', 'Standard', 'Sidebar']) {
    await page.getByRole('button', { name: template, exact: true }).click();
    await expect.poll(() => page.locator('.resume-paper-page-card').first().evaluate(card => {
      const clipped: string[] = [];
      card.querySelectorAll('*').forEach(element => {
        if (element.scrollWidth > element.clientWidth + 1) clipped.push(element.tagName);
      });
      return clipped;
    }), { message: `${template} must not clip long unbroken text` }).toEqual([]);
  }
  await page.screenshot({ path: testInfo.outputPath('long-token.png') });
});

test('mobile bottom navigation keeps every label on one line', async ({ page }, testInfo) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 780 });
    const nav = page.locator('nav.ui-edge-nav');
    await expect(nav).toBeVisible();
    expect(await nav.evaluate(element => Math.round(element.getBoundingClientRect().height)),
      'Navigation must stay a single row').toBeLessThanOrEqual(56);
    for (const label of await nav.locator('button > span').all()) {
      expect(await label.evaluate(element => ({
        clipped: element.scrollWidth > element.clientWidth,
        inside: element.getBoundingClientRect().right <= innerWidth + 1,
      }))).toEqual({ clipped: false, inside: true });
    }
    await page.screenshot({ path: testInfo.outputPath(`bottom-nav-${width}.png`), clip: { x: 0, y: 725, width, height: 55 } });
  }
});

test('long resume names stay readable in the project menu', async ({ page }) => {
  const longName = 'Senior Staff Platform Reliability Engineering Program Manager — International Growth & Payments';
  await page.getByTestId('project-selector').click();
  await page.getByRole('button', { name: /^Rename: / }).first().click();
  const input = page.getByRole('textbox', { name: /^Rename: / });
  await input.fill(longName); await input.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByTestId('project-selector').click();
  const item = page.getByRole('group', { name: /Choose resume/ }).locator('[data-project-switch] span').last();
  expect(await item.evaluate(element => ({
    clipped: element.scrollWidth > element.clientWidth + 1,
    title: element.getAttribute('title'),
    inside: element.getBoundingClientRect().right <= innerWidth + 1,
  }))).toEqual({ clipped: false, title: longName, inside: true });
  expect(await item.innerText()).toBe(longName);
});

test('unnamed resumes keep the editing placeholder but never print or export it', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill('---\nname: \ntitle: Engineer\n---\n\n## Skills\n\n- React\n');
  const heading = page.locator('.resume-paper-page-card h1').first();
  await expect(heading).toHaveText('NAME');

  await page.emulateMedia({ media: 'print' });
  await expect.poll(() => page.locator('[data-resume-placeholder]').first().evaluate(element => getComputedStyle(element).display))
    .toBe('none');
  await page.emulateMedia({ media: 'screen' });

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  const { readFile } = await import('node:fs/promises');
  const html = await readFile((await (await download).path())!, 'utf8');
  expect(html).not.toMatch(/data-resume-placeholder="true"/);
  expect(html).not.toMatch(/>NAME</);
});

test('narrow CSS dialog keeps actions visible and traps keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Custom CSS', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Custom CSS', exact: true });
  await expect(dialog).toBeFocused();
  const save = dialog.getByRole('button', { name: 'Save', exact: true });
  await page.keyboard.press('Shift+Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  expect(await save.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('printing the app shows the resume instead of a blank page', async ({ page }, testInfo) => {
  const canvas = page.locator('.resume-canvas-screen-preview');
  await expect(canvas).toHaveAttribute('data-pagination-ready', 'true');
  await page.emulateMedia({ media: 'print' });
  await expect.poll(() => canvas.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { centered: Math.abs(box.left - (innerWidth - box.width) / 2) <= 1, pageWidth: Math.round(box.width) };
  }), { message: 'Canvas must be laid out inside the printable area' }).toEqual({ centered: true, pageWidth: Math.round(210 * 96 / 25.4) });
  await expect.poll(() => page.locator('.resume-paper-page-card').first().evaluate(card => {
    const heading = card.querySelector('h1');
    const cardBox = card.getBoundingClientRect();
    const box = heading?.getBoundingClientRect();
    return Boolean(box && box.width > 0 && box.top >= cardBox.top && box.bottom <= cardBox.bottom
      && getComputedStyle(heading!).visibility === 'visible');
  }), { message: 'Resume heading must be laid out and painted inside the first printed page' }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('printed-app.png'), fullPage: false });
  await page.emulateMedia({ media: 'screen' });
});

test('exported HTML stays printable instead of inheriting the app print-hide rules', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  const { readFile } = await import('node:fs/promises');
  const html = await readFile((await (await download).path())!, 'utf8');
  expect(html).not.toMatch(/body\s*\*\s*\{[^}]*visibility\s*:\s*hidden/i);

  const documentPath = testInfo.outputPath('exported.html');
  await import('node:fs/promises').then(fs => fs.writeFile(documentPath, html, 'utf8'));
  const exported = await page.context().newPage();
  await exported.goto('file:///' + documentPath.replace(/\\/g, '/'), { waitUntil: 'load' });
  await exported.emulateMedia({ media: 'print' });
  await expect.poll(() => exported.evaluate(() => {
    const heading = document.querySelector('.resume-paper h1');
    if (!heading) return 'missing heading';
    return getComputedStyle(heading).visibility as string;
  }), { message: 'Resume content must stay visible when the exported file is printed' }).toBe('visible');
  await exported.screenshot({ path: testInfo.outputPath('exported-print.png') });
  await exported.close();
});

test('immediate HTML export includes the latest deferred preview content', async ({ page }) => {
  const markdown = `---\nname: Latest Export Draft\ntitle: Engineer\n---\n\n## Experience\n\n${Array.from({ length: 45 }, (_, index) => `- Latest item ${index}: ${'Resume detail. '.repeat(8)}`).join('\n')}`;
  await page.getByRole('textbox', { name: 'Resume Markdown' }).fill(markdown);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export HTML', exact: true }).click();
  const file = await download;
  const { readFile } = await import('node:fs/promises');
  const html = await readFile((await file.path())!, 'utf8');
  expect(html).toContain('Latest Export Draft');
  expect(html).toContain('Latest item 44');
  expect(html).not.toContain('EMMA SANCHEZ');
});
