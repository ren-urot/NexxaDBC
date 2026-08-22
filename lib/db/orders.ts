import { desc, eq, sql } from 'drizzle-orm';
import { db } from './client';
import { orders, type OrderRow } from './schema';

type OrderStatus = OrderRow['status'];
type PaymentMethod = NonNullable<OrderRow['paymentMethod']>;

export async function createOrder(input: {
  draftId: string;
  sessionId: string;
  amount: number;
}): Promise<OrderRow> {
  const [row] = await db.insert(orders).values(input).returning();
  return row;
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row ?? null;
}

export async function submitPayment(
  id: string,
  input: { paymentMethod: PaymentMethod; paymentReference: string; paymentProofUrl: string }
): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({ ...input, status: 'submitted', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}

export async function approveOrder(id: string, token: string, expiresAt: Date): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({
      status: 'approved',
      provisioningToken: token,
      provisioningTokenStatus: 'active',
      provisioningExpiresAt: expiresAt,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}

export async function rejectOrder(id: string, notes: string): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({ status: 'rejected', adminNotes: notes, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}

export async function regenerateProvisioningToken(
  id: string,
  token: string,
  expiresAt: Date
): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({
      provisioningToken: token,
      provisioningTokenStatus: 'active',
      provisioningExpiresAt: expiresAt,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}

export async function expireProvisioningToken(id: string): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({ provisioningTokenStatus: 'expired', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}

export async function listOrders(filter?: { status?: OrderStatus }): Promise<OrderRow[]> {
  if (filter?.status) {
    return db.select().from(orders).where(eq(orders.status, filter.status)).orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}
