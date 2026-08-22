import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, rejectOrder } from '@/lib/db/orders';
import { rejectOrderSchema } from '@/lib/validation/order-schema';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.status !== 'submitted') {
      return NextResponse.json(
        { error: `Order must be submitted to reject, currently ${order.status}` },
        { status: 409 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = rejectOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await rejectOrder(id, parsed.data.notes);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
