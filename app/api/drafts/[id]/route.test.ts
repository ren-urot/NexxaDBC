import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft, submitDraft } from '@/lib/db/drafts';
import { eq } from 'drizzle-orm';

const SESSION = 's1';

function getRequest(session: string | null = SESSION) {
  return new NextRequest('http://localhost', {
    headers: session ? { cookie: `dbc_session=${session}` } : {},
  });
}

function patchRequest(body: unknown, session: string | null = SESSION) {
  return new NextRequest('http://localhost', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(session ? { cookie: `dbc_session=${session}` } : {}),
    },
  });
}

function newDraft(templateId = 'corporate-vertical') {
  return createDraft({ sessionId: SESSION, templateId, orientation: 'vertical' });
}

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('GET /api/drafts/:id', () => {
  it('returns the draft', async () => {
    const draft = await newDraft();
    const res = await GET(getRequest(), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(draft.id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await GET(getRequest(), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when another session requests the draft', async () => {
    const draft = await newDraft();
    const res = await GET(getRequest('someone-else'), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the request carries no session cookie', async () => {
    const draft = await newDraft();
    const res = await GET(getRequest(null), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/drafts/:id', () => {
  it('updates card fields', async () => {
    const draft = await newDraft();
    const res = await PATCH(patchRequest({ firstName: 'Juan', email: 'juan@abc.com' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.firstName).toBe('Juan');
  });

  it('updates styleOverrides', async () => {
    const draft = await newDraft();
    const res = await PATCH(patchRequest({ styleOverrides: { accentColor: '#112233' } }), {
      params: Promise.resolve({ id: draft.id }),
    });
    const body = await res.json();
    expect(body.styleOverrides.accentColor).toBe('#112233');
  });

  it('rejects an invalid email', async () => {
    const draft = await newDraft();
    const res = await PATCH(patchRequest({ email: 'not-an-email' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when another session tries to mutate the draft', async () => {
    const draft = await newDraft();
    const res = await PATCH(patchRequest({ firstName: 'Mallory' }, 'someone-else'), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(404);

    const [row] = await db.select().from(cardDrafts).where(eq(cardDrafts.id, draft.id));
    expect(row.firstName).toBeNull();
  });

  it('returns 409 when the draft has already been submitted', async () => {
    const draft = await newDraft();
    await submitDraft(draft.id);
    const res = await PATCH(patchRequest({ firstName: 'Juan' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 409 when the draft has expired', async () => {
    const draft = await newDraft();
    await db.update(cardDrafts).set({ status: 'expired' }).where(eq(cardDrafts.id, draft.id));
    const res = await PATCH(patchRequest({ firstName: 'Juan' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects a fontSizeStep outside the template-declared bounds', async () => {
    // The generic schema allows ±2, but every registry template declares ±1.
    const draft = await newDraft();
    const res = await PATCH(patchRequest({ styleOverrides: { fontSizeStep: 2 } }), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(400);
  });

  it('accepts a fontSizeStep inside the template-declared bounds', async () => {
    const draft = await newDraft();
    const res = await PATCH(patchRequest({ styleOverrides: { fontSizeStep: 1 } }), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).styleOverrides.fontSizeStep).toBe(1);
  });
});
