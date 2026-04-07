import { test as base } from 'playwright-bdd';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await use(page);
  },
});
