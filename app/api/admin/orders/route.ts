import { NextRequest, NextResponse } from 'next/server';
import { listOrders } from '@/lib/db/orders';

const VALID_STATUSES = ['pending_payment', 'submitted', 'approved', 'rejected', 'provisioned'] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    if (status && !isOrderStatus(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }
    const result = await listOrders(status ? { status } : undefined);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
