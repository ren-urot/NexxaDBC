import { NextRequest, NextResponse } from 'next/server';
import { loadOwnedOrder } from '@/lib/order-access';
import { submitPayment } from '@/lib/db/orders';
import { paymentSubmissionSchema } from '@/lib/validation/order-schema';
import { uploadPaymentProof } from '@/lib/blob';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await loadOwnedOrder(req, id);
    if (!access.ok) return access.response;

    if (access.order.status !== 'pending_payment' && access.order.status !== 'rejected') {
      return NextResponse.json(
        { error: `Order is ${access.order.status} and cannot accept a new payment submission` },
        { status: 409 }
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Payment proof file is required' }, { status: 400 });
    }

    const parsed = paymentSubmissionSchema.safeParse({
      paymentMethod: form.get('paymentMethod'),
      paymentReference: form.get('paymentReference'),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const paymentProofUrl = await uploadPaymentProof(file, id);
    const updated = await submitPayment(id, { ...parsed.data, paymentProofUrl });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
