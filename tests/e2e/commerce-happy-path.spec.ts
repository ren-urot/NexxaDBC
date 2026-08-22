import { test, expect } from '@playwright/test';

test('submit a draft, pay, get approved, see the provisioning QR', async ({ page }) => {
  // Builder: create and submit a draft (mirrors builder-happy-path.spec.ts)
  await page.goto('/templates');
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.waitForURL(/\/builder\/.+/);

  await page.getByLabel('First name').fill('Juan');
  await page.getByLabel('Last name').fill('Dela Cruz');
  await page.getByLabel('Job title').fill('Sales Director');
  await page.getByLabel('Company', { exact: true }).fill('ABC Corporation');
  await page.getByLabel('Mobile number').fill('+639171234567');
  await page.getByLabel('Email').fill('juan@abc.com');

  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForURL(/\/submitted$/);

  // Commerce: start checkout
  await page.getByRole('button', { name: /continue to payment/i }).click();
  await page.waitForURL(/\/checkout\/.+/);
  const orderId = page.url().match(/\/checkout\/([^/]+)/)![1];

  // Pay with GCash, submit reference + proof
  await page.getByRole('radio', { name: /gcash/i }).click();
  await page.getByLabel(/reference/i).fill('GC-DEMO-REF-001');
  await page.getByLabel(/screenshot/i).setInputFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image-bytes'),
  });
  await page.getByRole('button', { name: /submit for review/i }).click();

  await page.waitForURL(/\/status$/);
  await expect(page.getByText(/under review/i)).toBeVisible();

  // Admin: sign in, approve the order
  await page.goto('/admin/login');
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD ?? 'demo-admin-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin\/orders$/);

  await page.goto(`/admin/orders/${orderId}`);
  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();
  await page.getByRole('button', { name: /^approve$/i }).click();

  await expect(page.getByText(/order · approved/i)).toBeVisible();

  // Back on the customer side: the status page now shows the provisioning QR
  await page.goto(`/checkout/${orderId}/status`);
  await expect(page.getByText(/scan to add to your phone/i)).toBeVisible();
});
