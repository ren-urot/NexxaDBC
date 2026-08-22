import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';
import { createOrder, approveOrder } from '@/lib/db/orders';
import { POST } from './route';

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('POST /api/admin/orders/:id/provisioning-qr/expire', () => {
  it('marks the token expired on an approved order', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await approveOrder(order.id, 'tok123', new Date(Date.now() + 1000));

    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: order.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.provisioningTokenStatus).toBe('expired');
    // Expiring must only flip the status, never clear the token itself —
    // the DB-helper layer (lib/db/orders.test.ts) already covers this, but
    // that test never goes through this route's JSON response, so it can't
    // catch a serialization bug that accidentally strips the field.
    expect(body.provisioningToken).toBe('tok123');
  });

  it('returns 409 when the order is not approved', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(res.status).toBe(409);
  });
});
