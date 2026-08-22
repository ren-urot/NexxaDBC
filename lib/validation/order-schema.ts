import { z } from 'zod';

export const paymentSubmissionSchema = z.object({
  paymentMethod: z.enum(['gcash', 'bank_transfer']),
  paymentReference: z.string().min(1).max(255),
});

export const rejectOrderSchema = z.object({
  notes: z.string().min(1).max(1000),
});

export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
