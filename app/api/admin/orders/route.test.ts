import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';
import { createOrder, submitPayment } from '@/lib/db/orders';
import { GET } from './route';

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('GET /api/admin/orders', () => {
  it('lists all orders', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });

    const res = await GET(new NextRequest('http://localhost/api/admin/orders'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it('filters by status', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await submitPayment(order.id, {
      paymentMethod: 'gcash',
      paymentReference: 'REF1',
      paymentProofUrl: 'https://blob.example.com/a.png',
    });

    const res = await GET(new NextRequest('http://localhost/api/admin/orders?status=submitted'));
    const body = await res.json();
    expect(body).toHaveLength(1);

    const noneRes = await GET(new NextRequest('http://localhost/api/admin/orders?status=approved'));
    expect(await noneRes.json()).toHaveLength(0);
  });

  it('rejects an invalid status filter', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/orders?status=not-a-status'));
    expect(res.status).toBe(400);
  });
});
