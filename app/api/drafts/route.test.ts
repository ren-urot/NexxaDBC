import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { db } from '@/lib/db/client';
import { cardDrafts, orders } from '@/lib/db/schema';

beforeEach(async () => {
  // orders.draftId references card_drafts.id — must clear the referencing
  // table first or a leftover order from a Commerce test run blocks this.
  await db.delete(orders);
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

  it('derives orientation from the template, ignoring a contradicting body', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      // corporate-vertical is a vertical template; the client claims otherwise.
      body: JSON.stringify({ templateId: 'corporate-vertical', orientation: 'horizontal' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.orientation).toBe('vertical');
  });

  it('creates a draft when orientation is omitted entirely', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'creative-horizontal' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.orientation).toBe('horizontal');
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
