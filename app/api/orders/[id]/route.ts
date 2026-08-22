import { NextRequest, NextResponse } from 'next/server';
import { loadOwnedOrder } from '@/lib/order-access';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await loadOwnedOrder(req, id);
    if (!access.ok) return access.response;
    return NextResponse.json(access.order);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
