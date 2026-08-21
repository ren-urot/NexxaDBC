import { test, expect } from '@playwright/test';

test('select template, fill form, customize, preview, submit', async ({ page }) => {
  await page.goto('/templates');
  await page.getByRole('button', { name: 'Select' }).first().click();

  await page.waitForURL(/\/builder\/.+/);

  await page.getByLabel('First name').fill('Juan');
  await page.getByLabel('Last name').fill('Dela Cruz');
  await page.getByLabel('Job title').fill('Sales Director');
  await page.getByLabel('Company', { exact: true }).fill('ABC Corporation');
  await page.getByLabel('Mobile number').fill('+639171234567');
  await page.getByLabel('Email').fill('juan@abc.com');

  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();

  await page.getByLabel('Accent color').fill('#ff5500');

  await page.getByRole('button', { name: /continue/i }).click();

  await page.waitForURL(/\/submitted$/);
  await expect(page.getByRole('heading', { name: /ready for checkout/i })).toBeVisible();
});
