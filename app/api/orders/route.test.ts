import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft, submitDraft, updateDraft } from '@/lib/db/drafts';
import { POST } from './route';

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

async function submittedDraft(sessionId: string) {
  const draft = await createDraft({ sessionId, templateId: 'corporate-vertical', orientation: 'vertical' });
  await updateDraft(draft.id, {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    jobTitle: 'Sales Director',
    company: 'ABC Corporation',
    mobile: '+639171234567',
    email: 'juan@abc.com',
  });
  return submitDraft(draft.id);
}

describe('POST /api/orders', () => {
  it('creates an order for a submitted draft owned by this session', async () => {
    const draft = await submittedDraft('s1');
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ draftId: draft!.id }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=s1' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.draftId).toBe(draft!.id);
    expect(body.status).toBe('pending_payment');
    expect(body.amount).toBe(499);
    // Reaching this route at all requires a draft owned by an existing
    // session (a brand-new, cookie-less visitor can never own a draft to
    // check out with), so the only reachable cookie behavior here is "no
    // new cookie is set" — the isNew branch exists for defensive parity
    // with Builder's POST /api/drafts, not because it's reachable from
    // this route in practice.
    expect(res.cookies.get('dbc_session')).toBeUndefined();
  });

  it('returns 404 for a draft owned by a different session', async () => {
    const draft = await submittedDraft('s1');
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ draftId: draft!.id }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=other' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown draft', async () => {
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ draftId: '00000000-0000-0000-0000-000000000000' }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=s1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 409 when the draft is not yet submitted', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ draftId: draft.id }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=s1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('rejects a malformed body', async () => {
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ draftId: 'not-a-uuid' }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=s1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
