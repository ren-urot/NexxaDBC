import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';
import { createOrder } from '@/lib/db/orders';
import { GET } from './route';

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('GET /api/admin/orders/:id', () => {
  it('returns the order merged with its draft', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });

    const res = await GET(new NextRequest('http://localhost'), { params: Promise.resolve({ id: order.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(order.id);
    expect(body.draft.id).toBe(draft.id);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });
});
