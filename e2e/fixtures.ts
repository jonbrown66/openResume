import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (/hydration|hydrated|did not match|validateDOMNesting|maximum update depth/i.test(message.text())) {
        errors.push(message.text());
      }
    });
    await use(errors);
    expect(errors, 'Unexpected browser runtime or hydration errors').toEqual([]);
  }, { auto: true }],
});
export { expect };
