import { NextResponse } from 'next/server';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { expireStaleDrafts } from '@/lib/db/drafts';

const FORTY_EIGHT_HOURS_MS = 1000 * 60 * 60 * 48;

export async function GET() {
  const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);
  const staleRows = await db
    .select({ id: cardDrafts.id })
    .from(cardDrafts)
    .where(and(eq(cardDrafts.status, 'draft'), lt(cardDrafts.updatedAt, cutoff)));

  await expireStaleDrafts(cutoff);

  return NextResponse.json({ expiredCount: staleRows.length });
}
