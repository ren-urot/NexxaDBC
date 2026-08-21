import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('POST /api/drafts', () => {
  it('creates a draft and sets a session cookie for a first-time visitor', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'corporate-vertical', orientation: 'vertical' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.templateId).toBe('corporate-vertical');
    expect(body.status).toBe('draft');
    expect(res.cookies.get('dbc_session')).toBeDefined();
  });

  it('reuses the existing session id and does not re-set the cookie', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'corporate-vertical', orientation: 'vertical' }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=known-session' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(res.cookies.get('dbc_session')).toBeUndefined();
  });

  it('rejects an unknown template id', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'not-a-real-template', orientation: 'vertical' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
