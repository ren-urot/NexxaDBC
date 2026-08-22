import { pgTable, uuid, varchar, text, jsonb, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import type { StyleOverrides } from '@/lib/templates/types';

export const draftStatusEnum = pgEnum('draft_status', ['draft', 'submitted', 'expired']);
export const orientationEnum = pgEnum('orientation', ['vertical', 'horizontal']);

export const cardDrafts = pgTable('card_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  templateId: varchar('template_id', { length: 64 }).notNull(),
  orientation: orientationEnum('orientation').notNull(),
  status: draftStatusEnum('status').notNull().default('draft'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  jobTitle: varchar('job_title', { length: 150 }),
  company: varchar('company', { length: 150 }),
  mobile: varchar('mobile', { length: 30 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  website: varchar('website', { length: 255 }),
  logoUrl: text('logo_url'),
  facebook: varchar('facebook', { length: 255 }),
  linkedin: varchar('linkedin', { length: 255 }),
  instagram: varchar('instagram', { length: 255 }),
  whatsapp: varchar('whatsapp', { length: 255 }),
  messenger: varchar('messenger', { length: 255 }),
  styleOverrides: jsonb('style_overrides').$type<StyleOverrides>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type CardDraftRow = typeof cardDrafts.$inferSelect;
export type CardDraftInsert = typeof cardDrafts.$inferInsert;

export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment',
  'submitted',
  'approved',
  'rejected',
  'provisioned',
]);
export const paymentMethodEnum = pgEnum('payment_method', ['gcash', 'bank_transfer']);
export const provisioningTokenStatusEnum = pgEnum('provisioning_token_status', [
  'active',
  'expired',
  'consumed',
]);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftId: uuid('draft_id')
    .notNull()
    .references(() => cardDrafts.id),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  status: orderStatusEnum('status').notNull().default('pending_payment'),
  amount: integer('amount').notNull(),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentProofUrl: text('payment_proof_url'),
  adminNotes: text('admin_notes'),
  provisioningToken: varchar('provisioning_token', { length: 64 }),
  provisioningTokenStatus: provisioningTokenStatusEnum('provisioning_token_status'),
  provisioningExpiresAt: timestamp('provisioning_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type OrderRow = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
