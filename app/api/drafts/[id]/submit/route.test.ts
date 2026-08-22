import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { cardDrafts, orders } from '@/lib/db/schema';
import { createDraft, updateDraft } from '@/lib/db/drafts';
import { POST } from './route';

const SESSION = 's1';

function submitRequest(session: string | null = SESSION) {
  return new NextRequest('http://localhost', {
    method: 'POST',
    headers: session ? { cookie: `dbc_session=${session}` } : {},
  });
}

async function completeDraft() {
  const draft = await createDraft({
    sessionId: SESSION,
    templateId: 'corporate-vertical',
    orientation: 'vertical',
  });
  await updateDraft(draft.id, {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    jobTitle: 'Sales Director',
    company: 'ABC Corporation',
    mobile: '+639171234567',
    email: 'juan@abc.com',
  });
  return draft;
}

beforeEach(async () => {
  // orders.draftId references card_drafts.id — must clear the referencing
  // table first or a leftover order from a Commerce test run blocks this.
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('POST /api/drafts/:id/submit', () => {
  it('submits a draft with all required fields present', async () => {
    const draft = await completeDraft();

    const res = await POST(submitRequest(), { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('submitted');
  });

  it('rejects submission when a required field is missing', async () => {
    const draft = await createDraft({
      sessionId: SESSION,
      templateId: 'corporate-vertical',
      orientation: 'vertical',
    });
    const res = await POST(submitRequest(), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(422);
  });

  it('returns 404 for an unknown draft', async () => {
    const res = await POST(submitRequest(), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when another session tries to submit the draft', async () => {
    const draft = await completeDraft();
    const res = await POST(submitRequest('someone-else'), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when the draft has already been submitted', async () => {
    const draft = await completeDraft();
    await POST(submitRequest(), { params: Promise.resolve({ id: draft.id }) });

    const res = await POST(submitRequest(), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(409);
  });
});
