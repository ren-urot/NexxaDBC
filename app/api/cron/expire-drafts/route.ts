import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { expireStaleDrafts } from '@/lib/db/drafts';
import { deleteLogo } from '@/lib/blob';

const FORTY_EIGHT_HOURS_MS = 1000 * 60 * 60 * 48;

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this check the
 * endpoint is a public full-table scan plus UPDATE.
 *
 * When CRON_SECRET is unset the check is skipped outside production so local dev
 * and the test suite can hit the route directly; in production an unset secret
 * is treated as a misconfiguration and every request is rejected, so forgetting
 * to set it fails closed rather than silently leaving the endpoint open.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);
    const staleRows = await db
      .select({ id: cardDrafts.id, logoUrl: cardDrafts.logoUrl })
      .from(cardDrafts)
      .where(and(eq(cardDrafts.status, 'draft'), lt(cardDrafts.updatedAt, cutoff)));

    await expireStaleDrafts(cutoff);

    // An expired draft's logo is unreachable, so delete the blob rather than
    // keep paying to store it. A failure here must not abort the sweep.
    let deletedLogoCount = 0;
    for (const row of staleRows) {
      if (!row.logoUrl) continue;
      try {
        await deleteLogo(row.logoUrl);
        deletedLogoCount++;
      } catch (err) {
        console.error(`Failed to delete logo blob for draft ${row.id}`, err);
      }
    }

    return NextResponse.json({ expiredCount: staleRows.length, deletedLogoCount });
  } catch (err) {
    console.error('expire-drafts cron failed', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
