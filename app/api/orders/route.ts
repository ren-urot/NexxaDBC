import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDraftById } from '@/lib/db/drafts';
import { createOrder, getOrderByDraftId } from '@/lib/db/orders';
import { resolveSessionId, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

const ORDER_AMOUNT = 499;

const createOrderSchema = z.object({
  draftId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionId, isNew } = resolveSessionId(req);

    const draft = await getDraftById(parsed.data.draftId);
    if (!draft || draft.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (draft.status !== 'submitted') {
      return NextResponse.json({ error: 'Draft must be submitted before checkout' }, { status: 409 });
    }

    // One order per draft, permanently — a rejected order is resubmitted via
    // POST /api/orders/:id/payment on the SAME order id (see the checkout
    // status page's resubmit flow), never by creating a second order here.
    // This route is only ever called again for the same draft via a
    // double-click or back-navigation, so any existing order is the right
    // one to hand back rather than creating a duplicate.
    const existing = await getOrderByDraftId(draft.id);
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const order = await createOrder({ draftId: draft.id, sessionId, amount: ORDER_AMOUNT });

    const res = NextResponse.json(order, { status: 201 });
    if (isNew) {
      res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    }
    return res;
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
