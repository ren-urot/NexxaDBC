import { desc } from 'drizzle-orm';
import { db } from './client';
import { customerHistory, type CustomerHistoryRow } from './schema';

export async function archiveOrder(input: {
  orderId: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  mobile: string | null;
  email: string | null;
  templateId: string;
  amount: number;
  orderCreatedAt: Date;
}): Promise<CustomerHistoryRow> {
  const [row] = await db.insert(customerHistory).values(input).returning();
  return row;
}

export async function listCustomerHistory(): Promise<CustomerHistoryRow[]> {
  return db.select().from(customerHistory).orderBy(desc(customerHistory.archivedAt));
}
