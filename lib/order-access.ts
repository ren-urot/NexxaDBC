import { NextResponse, type NextRequest } from 'next/server';
import { getOrderById } from '@/lib/db/orders';
import { SESSION_COOKIE } from '@/lib/session';
import type { OrderRow } from '@/lib/db/schema';

export type OrderAccess = { ok: true; order: OrderRow } | { ok: false; response: NextResponse };

function notFound(): NextResponse {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Mirrors lib/draft-access.ts's loadOwnedDraft: order ids are unguessable
 * UUIDs but travel in URLs, so possession alone must not be enough to read
 * or mutate someone else's order. A session mismatch answers 404, not 403,
 * for the same reason — it doesn't confirm the id exists to a prober.
 */
export async function loadOwnedOrder(req: NextRequest, id: string): Promise<OrderAccess> {
  const order = await getOrderById(id);
  if (!order) return { ok: false, response: notFound() };

  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId || order.sessionId !== sessionId) {
    return { ok: false, response: notFound() };
  }

  return { ok: true, order };
}
