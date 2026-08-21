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

/**
 * `cardDataPartialSchema` accepts '' for format-constrained optional fields
 * (email, website, logoUrl, facebook, linkedin, instagram, messenger) so an
 * in-progress "clear this field" edit can be saved without tripping
 * `.url()`/`.email()` validation. Coerce that '' to NULL here, before the
 * write, so the stored value genuinely means "unset" — matching these
 * nullable columns — rather than persisting a literal empty string that
 * would linger as a distinct, ambiguous "set to nothing" value everywhere
 * else the draft is read (submit, preview, cron).
 */
function normalizeEmptyStrings<T extends Record<string, unknown>>(patch: T): T {
  const normalized: Record<string, unknown> = { ...patch };
  for (const key of Object.keys(normalized)) {
    if (normalized[key] === '') normalized[key] = null;
  }
  return normalized as T;
}

export async function updateDraft(
  id: string,
  patch: CardDataPartialInput & { styleOverrides?: StyleOverridesInput }
): Promise<CardDraftRow | null> {
  const [row] = await db
    .update(cardDrafts)
    .set({ ...normalizeEmptyStrings(patch), updatedAt: sql`CURRENT_TIMESTAMP` })
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
