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

async function selectRadixOption(
  page: import('@playwright/test').Page,
  triggerLabel: string,
  value: string,
) {
  const group = page.locator('div', {
    has: page.locator(`span:text-is("${triggerLabel}")`),
  });
  await group.locator('button[role="combobox"]').click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

Given(
  'the user provides income details:',
  async ({ page }, table: DataTable) => {
    const data = tableToRecord(table);
    await page.goto('/cashflows');
    await page.getByRole('button', { name: 'Add Income' }).click();
    await page.getByPlaceholder('e.g. Salary').fill(data.name);
    await page.locator('input[type="number"]').fill(data.amount);

    if (data.currency && data.currency !== 'CZK') {
      await selectRadixOption(page, 'Currency', data.currency);
    }

    if (data.frequency && data.frequency !== 'MONTHLY') {
      const freqMap: Record<string, string> = {
        QUARTERLY: 'Quarterly',
        ANNUALLY: 'Annually',
      };
      await selectRadixOption(
        page,
        'Frequency',
        freqMap[data.frequency] ?? data.frequency,
      );
    }
  },
);

When('the user confirms the income', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

Then('an AddIncome event is created with status ACTIVE', async ({ page }) => {
  const store = await page.evaluate(() => {
    const raw = localStorage.getItem('event-store-dev');
    return raw ? JSON.parse(raw) : null;
  });
  expect(store).toBeTruthy();
  const event = store.events.find(
    (e: { type: string }) => e.type === 'add_income',
  );
  expect(event).toBeTruthy();
  expect(event.status).toBe('active');
});

Then(
  'an Income entity is created with amount {int} CZK and frequency MONTHLY',
  async ({ page }, amount: number) => {
    const store = await page.evaluate(() => {
      const raw = localStorage.getItem('event-store-dev');
      return raw ? JSON.parse(raw) : null;
    });
    const event = store.events.find(
      (e: { type: string }) => e.type === 'add_income',
    );
    expect(event.income.amount.amount).toBe(amount);
    expect(event.income.amount.currency).toBe('CZK');
    expect(event.income.frequency).toBe('monthly');

    await expect(page.getByText(event.income.name)).toBeVisible();
  },
);

Given(
  'the user provides expense details:',
  async ({ page }, table: DataTable) => {
    const data = tableToRecord(table);
    await page.goto('/cashflows');
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.getByPlaceholder('e.g. Groceries').fill(data.name);
    await page.locator('input[type="number"]').fill(data.amount);

    if (data.currency && data.currency !== 'CZK') {
      await selectRadixOption(page, 'Currency', data.currency);
    }

    if (data.frequency && data.frequency !== 'MONTHLY') {
      const freqMap: Record<string, string> = {
        QUARTERLY: 'Quarterly',
        ANNUALLY: 'Annually',
      };
      await selectRadixOption(
        page,
        'Frequency',
        freqMap[data.frequency] ?? data.frequency,
      );
    }
  },
);

When('the user confirms the expense', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

Then('an AddExpense event is created with status ACTIVE', async ({ page }) => {
  const store = await page.evaluate(() => {
    const raw = localStorage.getItem('event-store-dev');
    return raw ? JSON.parse(raw) : null;
  });
  expect(store).toBeTruthy();
  const event = store.events.find(
    (e: { type: string }) => e.type === 'add_expense',
  );
  expect(event).toBeTruthy();
  expect(event.status).toBe('active');
});

Then(
  'an Expense entity is created with amount {int} CZK and frequency MONTHLY',
  async ({ page }, amount: number) => {
    const store = await page.evaluate(() => {
      const raw = localStorage.getItem('event-store-dev');
      return raw ? JSON.parse(raw) : null;
    });
    const event = store.events.find(
      (e: { type: string }) => e.type === 'add_expense',
    );
    expect(event.expense.amount.amount).toBe(amount);
    expect(event.expense.amount.currency).toBe('CZK');
    expect(event.expense.frequency).toBe('monthly');

    await expect(page.getByText(event.expense.name)).toBeVisible();
  },
);
