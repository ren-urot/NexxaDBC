import { NextRequest, NextResponse } from 'next/server';
import { loadOwnedOrder } from '@/lib/order-access';
import { getDraftById } from '@/lib/db/drafts';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await loadOwnedOrder(req, id);
    if (!access.ok) return access.response;
    const draft = await getDraftById(access.order.draftId);
    return NextResponse.json({ ...access.order, draft });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
