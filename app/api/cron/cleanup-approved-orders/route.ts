import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';
import { getDraftById, updateDraft } from '@/lib/db/drafts';
import { archiveOrder } from '@/lib/db/customer-history';
import { deleteLogo, deletePaymentProof } from '@/lib/blob';

const FORTY_EIGHT_HOURS_MS = 1000 * 60 * 60 * 48;

/**
 * Same authorization approach as expire-drafts: fails closed in production
 * when CRON_SECRET is unset, skipped outside production for local dev/tests.
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
      .select({
        id: orders.id,
        draftId: orders.draftId,
        paymentProofUrl: orders.paymentProofUrl,
        amount: orders.amount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.status, 'approved'), lt(orders.updatedAt, cutoff), isNotNull(orders.paymentProofUrl)));

    let cleanedCount = 0;
    for (const row of staleRows) {
      try {
        const draft = await getDraftById(row.draftId);

        // Archive the full record before anything is deleted — this is the
        // durable history an admin can later export (Task 10), kept out of
        // the live draft/order rows once this run finishes.
        await archiveOrder({
          orderId: row.id,
          firstName: draft?.firstName ?? null,
          lastName: draft?.lastName ?? null,
          jobTitle: draft?.jobTitle ?? null,
          company: draft?.company ?? null,
          mobile: draft?.mobile ?? null,
          email: draft?.email ?? null,
          templateId: draft?.templateId ?? '',
          amount: row.amount,
          orderCreatedAt: row.createdAt,
        });

        if (row.paymentProofUrl) {
          await deletePaymentProof(row.paymentProofUrl);
        }
        if (draft?.logoUrl) {
          await deleteLogo(draft.logoUrl);
        }

        // Nulls every PII field in place — the draft row survives as a
        // minimal skeleton (id, template, timestamps), same as the order
        // does, now that the full record lives in customer_history instead.
        await updateDraft(row.draftId, {
          firstName: '',
          lastName: '',
          jobTitle: '',
          company: '',
          mobile: '',
          email: '',
          address: '',
          website: '',
          logoUrl: '',
          facebook: '',
          linkedin: '',
          instagram: '',
          whatsapp: '',
          messenger: '',
        });

        await db.update(orders).set({ paymentProofUrl: null }).where(eq(orders.id, row.id));
        cleanedCount++;
      } catch (err) {
        console.error(`Failed to clean up order ${row.id}`, err);
      }
    }

    return NextResponse.json({ cleanedCount });
  } catch (err) {
    console.error('cleanup-approved-orders cron failed', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
