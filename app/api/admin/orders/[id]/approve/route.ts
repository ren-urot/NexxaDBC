import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, approveOrder } from '@/lib/db/orders';

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

    const updated = await approveOrder(id);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
