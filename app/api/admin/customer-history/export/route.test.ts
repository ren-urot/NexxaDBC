import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/client';
import { customerHistory } from '@/lib/db/schema';
import { archiveOrder } from '@/lib/db/customer-history';
import { GET } from './route';

beforeEach(async () => {
  await db.delete(customerHistory);
});

describe('GET /api/admin/customer-history/export', () => {
  it('returns a CSV with a header row and one row per archived customer', async () => {
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

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    const lines = text.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'Order ID,First Name,Last Name,Job Title,Company,Mobile,Email,Template,Amount,Order Date,Archived At'
    );
    expect(lines[1]).toContain('Juan');
    expect(lines[1]).toContain('ABC Corporation');
  });

  it('returns just the header row when there is no history yet', async () => {
    const res = await GET();
    const text = await res.text();
    expect(text.trim().split('\r\n')).toHaveLength(1);
  });

  it('quotes a field containing a comma', async () => {
    await archiveOrder({
      orderId: '22222222-2222-2222-2222-222222222222',
      firstName: 'Ana',
      lastName: 'Reyes',
      jobTitle: 'Owner',
      company: 'Reyes, Inc.',
      mobile: '+639170000000',
      email: 'ana@reyes.example',
      templateId: 'minimal-horizontal',
      amount: 499,
      orderCreatedAt: new Date(),
    });

    const res = await GET();
    const text = await res.text();
    expect(text).toContain('"Reyes, Inc."');
  });

  it('guards a formula-injection attempt in a field', async () => {
    await archiveOrder({
      orderId: '33333333-3333-3333-3333-333333333333',
      firstName: 'Eve',
      lastName: 'Attacker',
      jobTitle: 'N/A',
      company: '=HYPERLINK("https://evil.example")',
      mobile: '+639170000001',
      email: 'eve@example.com',
      templateId: 'corporate-vertical',
      amount: 499,
      orderCreatedAt: new Date(),
    });

    const res = await GET();
    const text = await res.text();
    expect(text).toContain("'=HYPERLINK");
  });

  it('guards a Philippine mobile number so Excel does not misparse the leading +', async () => {
    await archiveOrder({
      orderId: '44444444-4444-4444-4444-444444444444',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales',
      company: 'ABC',
      mobile: '+639171234567',
      email: 'juan@abc.com',
      templateId: 'corporate-vertical',
      amount: 499,
      orderCreatedAt: new Date(),
    });

    const res = await GET();
    const text = await res.text();
    expect(text).toContain("'+639171234567");
  });
});
