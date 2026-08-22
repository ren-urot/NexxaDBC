import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { orders, cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';
import { createOrder, submitPayment as submitPaymentDb, approveOrder, rejectOrder } from '@/lib/db/orders';

vi.mock('@/lib/blob', () => ({
  uploadPaymentProof: vi.fn().mockResolvedValue('https://blob.example.com/proofs/fake.png'),
}));

import { POST } from './route';

function formDataRequest(cookie: string, fields: Record<string, string>, file?: File) {
  const req = new NextRequest('http://localhost', { method: 'POST', headers: { cookie } });
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) form.append('file', file);
  vi.spyOn(req, 'formData').mockResolvedValue(form);
  return req;
}

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
  vi.clearAllMocks();
});

describe('POST /api/orders/:id/payment', () => {
  it('submits payment and moves the order to submitted', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const file = new File(['bytes'], 'proof.png', { type: 'image/png' });
    const req = formDataRequest('dbc_session=s1', { paymentMethod: 'gcash', paymentReference: 'REF123' }, file);

    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('submitted');
    expect(body.paymentProofUrl).toBe('https://blob.example.com/proofs/fake.png');
  });

  it('rejects when no file is attached', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const req = formDataRequest('dbc_session=s1', { paymentMethod: 'gcash', paymentReference: 'REF123' });

    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown payment method', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const file = new File(['bytes'], 'proof.png', { type: 'image/png' });
    const req = formDataRequest('dbc_session=s1', { paymentMethod: 'cash', paymentReference: 'REF123' }, file);

    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a different session', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const file = new File(['bytes'], 'proof.png', { type: 'image/png' });
    const req = formDataRequest('dbc_session=other', { paymentMethod: 'gcash', paymentReference: 'REF123' }, file);

    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    expect(res.status).toBe(404);
  });

  it('returns 409 when the order has already been submitted', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await submitPaymentDb(order.id, {
      paymentMethod: 'gcash',
      paymentReference: 'REF1',
      paymentProofUrl: 'https://blob.example.com/a.png',
    });
    const file = new File(['bytes'], 'proof.png', { type: 'image/png' });
    const req = formDataRequest('dbc_session=s1', { paymentMethod: 'gcash', paymentReference: 'REF456' }, file);

    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    expect(res.status).toBe(409);
  });

  it('allows resubmission when the order was rejected', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await submitPaymentDb(order.id, {
      paymentMethod: 'gcash',
      paymentReference: 'REF1',
      paymentProofUrl: 'https://blob.example.com/a.png',
    });
    await rejectOrder(order.id, 'Reference did not match');

    const file = new File(['bytes'], 'proof2.png', { type: 'image/png' });
    const req = formDataRequest('dbc_session=s1', { paymentMethod: 'bank_transfer', paymentReference: 'REF2' }, file);

    const res = await POST(req, { params: Promise.resolve({ id: order.id }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('submitted');
    expect(body.paymentMethod).toBe('bank_transfer');
  });
});
