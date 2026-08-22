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

describe('POST /api/admin/orders/:id/reject', () => {
  it('rejects a submitted order with notes', async () => {
    const order = await submittedOrder();
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Reference does not match our records' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: order!.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('rejected');
    expect(body.adminNotes).toBe('Reference does not match our records');
  });

  it('rejects an empty notes body', async () => {
    const order = await submittedOrder();
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ notes: '' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: order!.id }) });
    expect(res.status).toBe(400);
  });

  it('returns 409 when the order is not submitted', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ notes: 'test' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    expect(res.status).toBe(409);
  });
});
