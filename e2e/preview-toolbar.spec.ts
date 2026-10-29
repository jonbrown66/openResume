import { test, expect } from './fixtures';

for (const language of ['zh', 'en'] as const) {
  test(`preview toolbar stays usable across pane widths (${language})`, async ({ page }) => {
    await page.addInitScript(language => {
      localStorage.setItem('myresume-settings-v1', JSON.stringify({ language, theme: 'light' }));
    }, language);
    await page.goto('/');
    const toolbar = page.getByTestId('preview-toolbar');
    const preview = page.getByRole('button', { name: language === 'zh' ? '预览' : 'Preview', exact: true });
    const templates = language === 'zh' ? ['经典', '极简', '标准', '侧栏'] : ['Classic', 'Minimal', 'Standard', 'Sidebar'];
    const customCss = language === 'zh' ? '自定义 CSS' : 'Custom CSS';
    const zoomGroup = toolbar.getByRole('group', { name: language === 'zh' ? '画布缩放' : 'Canvas zoom' });

    for (const width of [320, 390, 639, 640, 810, 1023, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      if (await preview.isVisible()) await preview.click();
      await expect(toolbar).toBeVisible();
      // Let the responsive layout settle before measuring, or the clone check can see a stale width.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const fitsOnOneRow = await toolbar.evaluate(bar => {
        const style = getComputedStyle(bar);
        const parent = bar.parentElement!;
        const parentStyle = getComputedStyle(parent);
        const available = parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);
        const children = [...bar.children].filter(child => child.getBoundingClientRect().width > 0);
        const gap = parseFloat(style.columnGap) || 0;
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const needed = children.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0)
          + gap * Math.max(children.length - 1, 0) + padding;
        return needed <= available + 1;
      });
      expect(await toolbar.evaluate(bar => {
        const rows = new Set([...bar.querySelectorAll('button')].map(button => Math.round(button.getBoundingClientRect().top)));
        return rows.size;
      }), `Toolbar rows at ${width}px`).toBe(fitsOnOneRow ? 1 : 2);
      await expect.poll(() => toolbar.evaluate(bar => {
        const bounds = bar.getBoundingClientRect();
        const pane = bar.parentElement!.parentElement!.getBoundingClientRect();
        const scroll = bar.parentElement!.nextElementSibling!.getBoundingClientRect();
        const failures: string[] = [];
        if (bounds.left < pane.left || bounds.right > pane.right) failures.push('outside preview pane');
        if (bounds.bottom > scroll.top) failures.push('covers canvas');
        const buttons = [...bar.querySelectorAll('button')];
        for (const [index, button] of buttons.entries()) {
          const rect = button.getBoundingClientRect();
          const label = button.textContent || button.getAttribute('aria-label');
          if (rect.left < bounds.left || rect.right > bounds.right || rect.top < bounds.top || rect.bottom > bounds.bottom) {
            failures.push(`outside toolbar: ${label}`);
          }
          for (const other of buttons.slice(index + 1)) {
            const next = other.getBoundingClientRect();
            if (Math.min(rect.right, next.right) > Math.max(rect.left, next.left)
              && Math.min(rect.bottom, next.bottom) > Math.max(rect.top, next.top)) failures.push(`overlapping button: ${label}`);
          }
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          for (const [x, y] of [[centerX, centerY], [rect.left + 2, centerY], [rect.right - 2, centerY],
            [centerX, rect.top + 2], [centerX, rect.bottom - 2]]) {
            if (!button.contains(document.elementFromPoint(x, y))) failures.push(`covered button: ${label}`);
          }
        }
        return failures;
      }), { message: `Toolbar geometry at ${width}px (${language})` }).toEqual([]);

      for (const name of templates) {
        const button = toolbar.getByRole('button', { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
      }
      await toolbar.getByRole('button', { name: customCss, exact: true }).click();
      await expect(page.getByRole('dialog', { name: customCss, exact: true })).toBeVisible();
      await page.getByRole('button', { name: language === 'zh' ? '关闭' : 'Close', exact: true }).click();
      await expect(page.getByRole('dialog', { name: customCss, exact: true })).not.toBeVisible();

      const initialZoom = await zoomGroup.textContent();
      await zoomGroup.getByRole('button', { name: language === 'zh' ? '放大画布' : 'Zoom in', exact: true }).click();
      await expect(zoomGroup).not.toHaveText(initialZoom!);
      await zoomGroup.getByRole('button', { name: language === 'zh' ? '缩小画布' : 'Zoom out', exact: true }).click();
      await expect(zoomGroup).toHaveText(initialZoom!);
      await expect(zoomGroup.getByRole('button')).toHaveCount(2);
      await expect.poll(() => page.getByTestId('preview-scroll').evaluate(element =>
        element.scrollWidth - element.clientWidth), { message: `Default zoom overflow at ${width}px (${language})` }).toBeLessThanOrEqual(1);
    }
  });
}
