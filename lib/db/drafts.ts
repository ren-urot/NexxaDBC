import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from './client';
import { cardDrafts, type CardDraftRow } from './schema';
import type { CardDataPartialInput, StyleOverridesInput } from '@/lib/validation/card-schema';
import type { Orientation } from '@/lib/templates/types';

export async function createDraft(input: {
  sessionId: string;
  templateId: string;
  orientation: Orientation;
}): Promise<CardDraftRow> {
  const [row] = await db.insert(cardDrafts).values(input).returning();
  return row;
}

export async function getDraftById(id: string): Promise<CardDraftRow | null> {
  const [row] = await db.select().from(cardDrafts).where(eq(cardDrafts.id, id));
  return row ?? null;
}

export async function updateDraft(
  id: string,
  patch: CardDataPartialInput & { styleOverrides?: StyleOverridesInput }
): Promise<CardDraftRow | null> {
  const [row] = await db
    .update(cardDrafts)
    .set({ ...patch, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(cardDrafts.id, id))
    .returning();
  return row ?? null;
}

export async function submitDraft(id: string): Promise<CardDraftRow | null> {
  const [row] = await db
    .update(cardDrafts)
    .set({ status: 'submitted', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(cardDrafts.id, id))
    .returning();
  return row ?? null;
}

export async function expireStaleDrafts(cutoff: Date): Promise<void> {
  await db
    .update(cardDrafts)
    .set({ status: 'expired' })
    .where(and(eq(cardDrafts.status, 'draft'), lt(cardDrafts.updatedAt, cutoff)));
}
