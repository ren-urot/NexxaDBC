import { test, expect } from '@playwright/test';

test('submit a draft, pay, get approved, see the provisioning QR', async ({ page, context }) => {
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

  // Admin: sign in and approve the order from a *separate* tab, leaving the
  // customer's status page (`page`) open and untouched throughout. The
  // status page polls while "under review" — it must pick up the approval
  // and reveal the QR on its own, with no reload/navigation on `page`.
  const admin = await context.newPage();
  await admin.goto('/admin/login');
  await admin.getByLabel('Password').fill(process.env.ADMIN_PASSWORD ?? 'demo-admin-password');
  await admin.getByRole('button', { name: /sign in/i }).click();
  await admin.waitForURL(/\/admin\/orders$/);

  await admin.goto(`/admin/orders/${orderId}`);
  await expect(admin.getByText('Juan Dela Cruz')).toBeVisible();
  await admin.getByRole('button', { name: /^approve$/i }).click();
  await expect(admin.getByText(/order · approved/i)).toBeVisible();
  await admin.close();

  // Back on the still-open customer tab: no reload, just the poll picking
  // up the outcome and showing the provisioning QR.
  await expect(page.getByText(/scan to add to your phone/i)).toBeVisible({ timeout: 10000 });

  // Provisioning + Holder: extract the QR's encoded value (Playwright can't
  // decode a rendered QR image, so the component carries it in a data
  // attribute for exactly this purpose) and complete the transfer as if it
  // had actually been scanned.
  const qrValue = await page.locator('[data-qr-value]').getAttribute('data-qr-value');
  expect(qrValue).toBeTruthy();

  await page.goto(qrValue!);
  await page.waitForURL(/\/holder$/);
  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();
  await expect(page.getByRole('button', { name: /save to contacts/i })).toBeVisible();

  // Refreshing /holder/install with the same (already-consumed-on-this-
  // device) fragment must not error or re-process — it should just land
  // back on /holder.
  await page.goto(qrValue!);
  await page.waitForURL(/\/holder$/);
  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();
});
