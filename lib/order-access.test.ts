import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';
import { createOrder } from '@/lib/db/orders';
import { SESSION_COOKIE } from '@/lib/session';
import { loadOwnedOrder } from './order-access';

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('loadOwnedOrder', () => {
  it('returns the order when the session cookie matches', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const req = new NextRequest('http://localhost', { headers: { cookie: `${SESSION_COOKIE}=s1` } });

    const access = await loadOwnedOrder(req, order.id);
    expect(access.ok).toBe(true);
    if (access.ok) expect(access.order.id).toBe(order.id);
  });

  it('returns 404 when the session cookie does not match', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const req = new NextRequest('http://localhost', { headers: { cookie: `${SESSION_COOKIE}=other-session` } });

    const access = await loadOwnedOrder(req, order.id);
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(404);
  });

  it('returns 404 when no session cookie is present', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const req = new NextRequest('http://localhost');

    const access = await loadOwnedOrder(req, order.id);
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(404);
  });

  it('returns 404 when the order does not exist', async () => {
    const req = new NextRequest('http://localhost', { headers: { cookie: `${SESSION_COOKIE}=s1` } });
    const access = await loadOwnedOrder(req, '00000000-0000-0000-0000-000000000000');
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(404);
  });
});
