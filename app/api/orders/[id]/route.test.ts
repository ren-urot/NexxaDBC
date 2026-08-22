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

describe('GET /api/orders/:id', () => {
  it('returns the order for the owning session', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });

    const req = new NextRequest('http://localhost', { headers: { cookie: 'dbc_session=s1' } });
    const res = await GET(req, { params: Promise.resolve({ id: order.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(order.id);
  });

  it('returns 404 for a different session', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });

    const req = new NextRequest('http://localhost', { headers: { cookie: 'dbc_session=other' } });
    const res = await GET(req, { params: Promise.resolve({ id: order.id }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown order', async () => {
    const req = new NextRequest('http://localhost', { headers: { cookie: 'dbc_session=s1' } });
    const res = await GET(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    expect(res.status).toBe(404);
  });
});
