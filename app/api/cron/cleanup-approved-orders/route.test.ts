import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders, cardDrafts, customerHistory } from '@/lib/db/schema';
import { createDraft, updateDraft, getDraftById } from '@/lib/db/drafts';
import { createOrder, approveOrder } from '@/lib/db/orders';
import { listCustomerHistory } from '@/lib/db/customer-history';

vi.mock('@/lib/blob', () => ({
  deleteLogo: vi.fn().mockResolvedValue(undefined),
  deletePaymentProof: vi.fn().mockResolvedValue(undefined),
  uploadLogo: vi.fn(),
  uploadPaymentProof: vi.fn(),
}));

import { deleteLogo, deletePaymentProof } from '@/lib/blob';
import { GET } from './route';

function cronRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/cleanup-approved-orders', { headers });
}

async function makeStaleApprovedOrder(opts: { logoUrl?: string } = {}) {
  const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
  await updateDraft(draft.id, {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    jobTitle: 'Sales',
    company: 'ABC',
    mobile: '+639171234567',
    email: 'juan@abc.com',
    logoUrl: opts.logoUrl,
  });
  const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
  await approveOrder(order.id);
  await db
    .update(orders)
    .set({
      paymentProofUrl: 'https://blob.example.com/proof.png',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    })
    .where(eq(orders.id, order.id));
  return { draft, order };
}

beforeEach(async () => {
  await db.delete(customerHistory);
  await db.delete(orders);
  await db.delete(cardDrafts);
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/cleanup-approved-orders', () => {
  it('archives the full record, deletes the payment proof, and nulls PII on drafts approved over 48h ago', async () => {
    const { draft, order } = await makeStaleApprovedOrder();

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.cleanedCount).toBe(1);
    expect(deletePaymentProof).toHaveBeenCalledWith('https://blob.example.com/proof.png');

    const history = await listCustomerHistory();
    expect(history).toHaveLength(1);
    expect(history[0].orderId).toBe(order.id);
    expect(history[0].firstName).toBe('Juan');
    expect(history[0].company).toBe('ABC');
    expect(history[0].amount).toBe(499);

    const updatedDraft = await getDraftById(draft.id);
    expect(updatedDraft?.firstName).toBeNull();
    expect(updatedDraft?.email).toBeNull();
    expect(updatedDraft?.templateId).toBe('corporate-vertical');

    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(updatedOrder.paymentProofUrl).toBeNull();
    expect(updatedOrder.status).toBe('approved');
  });

  it('deletes the logo blob when the draft has one', async () => {
    await makeStaleApprovedOrder({ logoUrl: 'https://blob.example.com/logo.png' });
    await GET(cronRequest());
    expect(deleteLogo).toHaveBeenCalledWith('https://blob.example.com/logo.png');
  });

  it('leaves a recently-approved order untouched', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await approveOrder(order.id);
    await db
      .update(orders)
      .set({ paymentProofUrl: 'https://blob.example.com/proof.png' })
      .where(eq(orders.id, order.id));

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.cleanedCount).toBe(0);
    expect(deletePaymentProof).not.toHaveBeenCalled();
    expect(await listCustomerHistory()).toHaveLength(0);
  });

  it('does not reprocess an order already cleaned up', async () => {
    await makeStaleApprovedOrder();
    await GET(cronRequest());
    vi.clearAllMocks();

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.cleanedCount).toBe(0);
    expect(deletePaymentProof).not.toHaveBeenCalled();
    // Already-archived, not re-archived on a repeat run.
    expect(await listCustomerHistory()).toHaveLength(1);
  });

  it('rejects a request without the cron secret when one is configured', async () => {
    process.env.CRON_SECRET = 'top-secret';
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it('accepts a request carrying the configured cron secret', async () => {
    process.env.CRON_SECRET = 'top-secret';
    const res = await GET(cronRequest({ authorization: 'Bearer top-secret' }));
    expect(res.status).toBe(200);
  });
});
