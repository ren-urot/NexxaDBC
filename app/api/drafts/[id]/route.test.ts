import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('GET /api/drafts/:id', () => {
  it('returns the draft', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const res = await GET(new NextRequest('http://localhost'), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(draft.id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/drafts/:id', () => {
  it('updates card fields', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Juan', email: 'juan@abc.com' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.firstName).toBe('Juan');
  });

  it('updates styleOverrides', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ styleOverrides: { accentColor: '#112233' } }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();
    expect(body.styleOverrides.accentColor).toBe('#112233');
  });

  it('rejects an invalid email', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(400);
  });
});
