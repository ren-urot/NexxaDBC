import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './client';
import { customerHistory, orders, cardDrafts } from './schema';
import { archiveOrder, listCustomerHistory } from './customer-history';

beforeEach(async () => {
  await db.delete(customerHistory);
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('archiveOrder / listCustomerHistory', () => {
  it('archives a full record and lists it back newest first', async () => {
    await archiveOrder({
      orderId: '11111111-1111-1111-1111-111111111111',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales Director',
      company: 'ABC Corporation',
      mobile: '+639171234567',
      email: 'juan@abc.com',
      templateId: 'corporate-vertical',
      amount: 499,
      orderCreatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    await archiveOrder({
      orderId: '22222222-2222-2222-2222-222222222222',
      firstName: 'Ana',
      lastName: 'Reyes',
      jobTitle: 'Owner',
      company: 'Reyes Bakery',
      mobile: '+639170000000',
      email: 'ana@reyes.example',
      templateId: 'minimal-horizontal',
      amount: 499,
      orderCreatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    const history = await listCustomerHistory();
    expect(history).toHaveLength(2);
    // Newest archivedAt first — both were archived moments apart in this
    // test, so this asserts ordering by checking the more recently-inserted
    // row (Ana's) comes first, not by asserting on orderCreatedAt order.
    expect(history[0].company).toBe('Reyes Bakery');
    expect(history[1].company).toBe('ABC Corporation');
  });

  it('is a no-op on a second call for the same orderId, keeping the first archive', async () => {
    await archiveOrder({
      orderId: '33333333-3333-3333-3333-333333333333',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales Director',
      company: 'ABC Corporation',
      mobile: '+639171234567',
      email: 'juan@abc.com',
      templateId: 'corporate-vertical',
      amount: 499,
      orderCreatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    // Same orderId, different fields — proves this is a no-op rather than a
    // duplicate insert or an overwrite of the first archive.
    await archiveOrder({
      orderId: '33333333-3333-3333-3333-333333333333',
      firstName: 'Someone',
      lastName: 'Else',
      jobTitle: 'Different',
      company: 'Different Corp',
      mobile: '+639170000001',
      email: 'someone@else.example',
      templateId: 'minimal-horizontal',
      amount: 999,
      orderCreatedAt: new Date('2026-02-02T00:00:00Z'),
    });

    const history = await listCustomerHistory();
    const rowsForOrder = history.filter(row => row.orderId === '33333333-3333-3333-3333-333333333333');
    expect(rowsForOrder).toHaveLength(1);
    expect(rowsForOrder[0].company).toBe('ABC Corporation');
  });
});
