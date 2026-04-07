import { expect } from '@playwright/test';
import { createBdd, type DataTable } from 'playwright-bdd';
import { test } from '../fixtures';

const { Given, When, Then } = createBdd(test);

function tableToRecord(table: DataTable): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, value] of table.rows()) {
    result[field] = value;
  }
  return result;
}

Given(
  'the user provides asset details:',
  async ({ page }, table: DataTable) => {
    const data = tableToRecord(table);
    await page.goto('/assets');
    await page.getByRole('button', { name: 'Add Asset' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('e.g. Savings').fill(data.name);

    if (data.kind === 'flat') {
      await dialog.getByRole('combobox').filter({ hasText: 'Cash' }).click();
      await page.getByRole('option', { name: 'Flat', exact: true }).click();
    }

    const numberInputs = dialog.locator('input[type="number"]');
    await numberInputs.first().fill(data.value);

    if (data.currency && data.currency !== 'CZK') {
      await dialog.getByRole('combobox').filter({ hasText: 'CZK' }).click();
      await page
        .getByRole('option', { name: data.currency, exact: true })
        .click();
    }

    if (data.growth_rate) {
      await numberInputs.last().fill(data.growth_rate);
    }
  },
);

When('the user confirms the asset', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

Then('an AddAsset event is created with status ACTIVE', async ({ page }) => {
  const store = await page.evaluate(() => {
    const raw = localStorage.getItem('event-store-dev');
    return raw ? JSON.parse(raw) : null;
  });
  expect(store).toBeTruthy();
  const event = store.events.find(
    (e: { type: string }) => e.type === 'add_asset',
  );
  expect(event).toBeTruthy();
  expect(event.status).toBe('active');
});

Then(
  'a Cash asset is created with value {int} CZK and growth rate {float}',
  async ({ page }, value: number, growthRate: number) => {
    const store = await page.evaluate(() => {
      const raw = localStorage.getItem('event-store-dev');
      return raw ? JSON.parse(raw) : null;
    });
    const event = store.events.find(
      (e: { type: string }) => e.type === 'add_asset',
    );
    expect(event.asset.kind).toBe('cash');
    expect(event.asset.value.amount).toBe(value);
    expect(event.asset.value.currency).toBe('CZK');
    expect(event.asset.growthRate).toBeCloseTo(growthRate, 4);

    await expect(page.getByText(event.asset.name)).toBeVisible();
  },
);

Then(
  'a Flat asset is created with value {int} CZK and growth rate {float}',
  async ({ page }, value: number, growthRate: number) => {
    const store = await page.evaluate(() => {
      const raw = localStorage.getItem('event-store-dev');
      return raw ? JSON.parse(raw) : null;
    });
    const event = store.events.find(
      (e: { type: string }) => e.type === 'add_asset',
    );
    expect(event.asset.kind).toBe('flat');
    expect(event.asset.value.amount).toBe(value);
    expect(event.asset.value.currency).toBe('CZK');
    expect(event.asset.growthRate).toBeCloseTo(growthRate, 4);

    await expect(page.getByText(event.asset.name)).toBeVisible();
  },
);
