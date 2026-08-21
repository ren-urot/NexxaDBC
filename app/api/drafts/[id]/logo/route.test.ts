import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft, submitDraft } from '@/lib/db/drafts';

vi.mock('@/lib/blob', () => ({
  uploadLogo: vi.fn().mockResolvedValue('https://blob.example.com/logos/fake.png'),
}));

import { POST } from './route';

const SESSION = 's1';

// Helper to create a mock NextRequest with FormData that works correctly.
// `req.formData()` is stubbed rather than passing the FormData as the request
// body because jsdom/undici cannot parse a multipart body back out of a
// Request constructed this way — the parsed form comes back empty.
function createFormDataRequest(id: string, file?: File, session: string | null = SESSION) {
  const req = new NextRequest(`http://localhost/api/drafts/${id}/logo`, {
    method: 'POST',
    headers: session ? { cookie: `dbc_session=${session}` } : {},
  });

  // Mock the formData method
  const form = new FormData();
  if (file) {
    form.append('file', file);
  }

  vi.spyOn(req, 'formData').mockResolvedValue(form);
  return req;
}

beforeEach(async () => {
  await db.delete(cardDrafts);
  vi.clearAllMocks();
});

describe('POST /api/drafts/:id/logo', () => {
  it('uploads a logo and stores its url on the draft', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    const req = createFormDataRequest(draft.id, file);

    const res = await POST(req, { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logoUrl).toBe('https://blob.example.com/logos/fake.png');
  });

  it('rejects a request with no file', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = createFormDataRequest(draft.id);
    const res = await POST(req, { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown draft', async () => {
    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    const req = createFormDataRequest('00000000-0000-0000-0000-000000000000', file);
    const res = await POST(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when another session uploads to the draft', async () => {
    const draft = await createDraft({ sessionId: SESSION, templateId: 'corporate-vertical', orientation: 'vertical' });
    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    const req = createFormDataRequest(draft.id, file, 'someone-else');
    const res = await POST(req, { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(404);
  });

  it('returns 409 for a draft that has already been submitted', async () => {
    const draft = await createDraft({ sessionId: SESSION, templateId: 'corporate-vertical', orientation: 'vertical' });
    await submitDraft(draft.id);
    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    const res = await POST(createFormDataRequest(draft.id, file), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(409);
  });
});
