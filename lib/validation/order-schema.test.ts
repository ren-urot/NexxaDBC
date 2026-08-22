import { describe, it, expect } from 'vitest';
import { paymentSubmissionSchema, rejectOrderSchema } from './order-schema';

describe('paymentSubmissionSchema', () => {
  it('accepts a valid gcash submission', () => {
    expect(
      paymentSubmissionSchema.safeParse({ paymentMethod: 'gcash', paymentReference: 'REF123' }).success
    ).toBe(true);
  });

  it('accepts a valid bank_transfer submission', () => {
    expect(
      paymentSubmissionSchema.safeParse({ paymentMethod: 'bank_transfer', paymentReference: 'REF456' })
        .success
    ).toBe(true);
  });

  it('rejects an unknown payment method', () => {
    expect(
      paymentSubmissionSchema.safeParse({ paymentMethod: 'cash', paymentReference: 'REF123' }).success
    ).toBe(false);
  });

  it('rejects an empty reference', () => {
    expect(paymentSubmissionSchema.safeParse({ paymentMethod: 'gcash', paymentReference: '' }).success).toBe(
      false
    );
  });
});

describe('rejectOrderSchema', () => {
  it('accepts a non-empty note', () => {
    expect(rejectOrderSchema.safeParse({ notes: 'Reference does not match' }).success).toBe(true);
  });

  it('rejects an empty note', () => {
    expect(rejectOrderSchema.safeParse({ notes: '' }).success).toBe(false);
  });
});
