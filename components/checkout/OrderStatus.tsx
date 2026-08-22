'use client';

import { QRCodeSVG } from 'qrcode.react';

const STATUS_COPY: Record<string, { label: string; body: string }> = {
  pending_payment: {
    label: 'Waiting for payment',
    body: 'Head back to checkout to pay and submit your reference.',
  },
  submitted: {
    label: 'Under review',
    body: "We're verifying your payment. This usually takes a little while.",
  },
  approved: {
    label: 'Approved',
    body: 'Your card is ready. Scan the code below to add it to your phone.',
  },
  rejected: {
    label: 'Payment rejected',
    body: 'Something was off with your payment. See the note below and resubmit.',
  },
  provisioned: {
    label: 'Provisioned',
    body: 'Your card has been transferred to your phone.',
  },
};

interface OrderStatusProps {
  status: string;
  adminNotes?: string | null;
  provisioningToken?: string | null;
  provisioningTokenStatus?: string | null;
  origin: string;
}

export function OrderStatus({
  status,
  adminNotes,
  provisioningToken,
  provisioningTokenStatus,
  origin,
}: OrderStatusProps) {
  const copy = STATUS_COPY[status] ?? { label: status, body: '' };
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">{copy.label}</p>
        <p className="mt-2 text-ink-soft">{copy.body}</p>
      </div>
      {status === 'rejected' && adminNotes && (
        <p role="alert" className="rounded-sm border border-ink/20 bg-stock px-4 py-3 text-sm text-ink">
          {adminNotes}
        </p>
      )}
      {status === 'approved' && provisioningToken && provisioningTokenStatus === 'active' && (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-stock p-6">
          <QRCodeSVG value={`${origin}/provision/${provisioningToken}`} size={200} />
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">Scan to add to your phone</p>
        </div>
      )}
    </div>
  );
}
