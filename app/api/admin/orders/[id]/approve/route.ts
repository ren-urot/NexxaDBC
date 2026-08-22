import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getOrderById, approveOrder } from '@/lib/db/orders';

const PROVISIONING_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.status !== 'submitted') {
      return NextResponse.json(
        { error: `Order must be submitted to approve, currently ${order.status}` },
        { status: 409 }
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PROVISIONING_TOKEN_TTL_MS);
    const updated = await approveOrder(id, token, expiresAt);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
