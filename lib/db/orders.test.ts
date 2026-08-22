import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './client';
import { orders, cardDrafts } from './schema';
import { createDraft } from './drafts';
import {
  createOrder,
  getOrderById,
  submitPayment,
  approveOrder,
  rejectOrder,
  regenerateProvisioningToken,
  expireProvisioningToken,
  listOrders,
} from './orders';

async function makeDraft() {
  return createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
}

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('createOrder', () => {
  it('creates an order with defaults', async () => {
    const draft = await makeDraft();
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    expect(order.status).toBe('pending_payment');
    expect(order.amount).toBe(499);
  });
});

describe('getOrderById', () => {
  it('returns the order when it exists', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const fetched = await getOrderById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('returns null when it does not exist', async () => {
    expect(await getOrderById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('submitPayment', () => {
  it('sets payment fields and moves status to submitted', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const updated = await submitPayment(created.id, {
      paymentMethod: 'gcash',
      paymentReference: 'REF123',
      paymentProofUrl: 'https://blob.example.com/proof.png',
    });
    expect(updated?.status).toBe('submitted');
    expect(updated?.paymentMethod).toBe('gcash');
    expect(updated?.paymentReference).toBe('REF123');
  });
});

describe('approveOrder', () => {
  it('sets status approved and stores the provisioning token', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const updated = await approveOrder(created.id, 'tok123', expiresAt);
    expect(updated?.status).toBe('approved');
    expect(updated?.provisioningToken).toBe('tok123');
    expect(updated?.provisioningTokenStatus).toBe('active');
  });
});

describe('rejectOrder', () => {
  it('sets status rejected and stores admin notes', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const updated = await rejectOrder(created.id, 'Reference number does not match');
    expect(updated?.status).toBe('rejected');
    expect(updated?.adminNotes).toBe('Reference number does not match');
  });
});

describe('regenerateProvisioningToken', () => {
  it('replaces the token and resets expiry', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await approveOrder(created.id, 'old-token', new Date());
    const newExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const updated = await regenerateProvisioningToken(created.id, 'new-token', newExpiry);
    expect(updated?.provisioningToken).toBe('new-token');
    expect(updated?.provisioningTokenStatus).toBe('active');
  });
});

describe('expireProvisioningToken', () => {
  it('marks the token expired without clearing it', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await approveOrder(created.id, 'tok123', new Date());
    const updated = await expireProvisioningToken(created.id);
    expect(updated?.provisioningTokenStatus).toBe('expired');
    expect(updated?.provisioningToken).toBe('tok123');
  });
});

describe('listOrders', () => {
  it('returns all orders newest first', async () => {
    const draft = await makeDraft();
    const first = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const second = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const all = await listOrders();
    expect(all.map(o => o.id)).toEqual([second.id, first.id]);
  });

  it('filters by status', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await submitPayment(created.id, {
      paymentMethod: 'gcash',
      paymentReference: 'REF1',
      paymentProofUrl: 'https://blob.example.com/a.png',
    });
    const submittedOnly = await listOrders({ status: 'submitted' });
    expect(submittedOnly.map(o => o.id)).toEqual([created.id]);
    expect(await listOrders({ status: 'approved' })).toHaveLength(0);
  });
});
