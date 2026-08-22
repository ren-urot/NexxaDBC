import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';
import { createOrder, submitPayment } from '@/lib/db/orders';
import { POST } from './route';

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

async function submittedOrder() {
  const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
  const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
  return submitPayment(order.id, {
    paymentMethod: 'gcash',
    paymentReference: 'REF1',
    paymentProofUrl: 'https://blob.example.com/a.png',
  });
}

describe('POST /api/admin/orders/:id/approve', () => {
  it('approves a submitted order and generates a provisioning token', async () => {
    const order = await submittedOrder();
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: order!.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('approved');
    expect(body.provisioningToken).toMatch(/^[0-9a-f]{64}$/);
    expect(body.provisioningTokenStatus).toBe('active');
    expect(new Date(body.provisioningExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('returns 409 when the order is not submitted', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });
});
