'use client';

import { encodeCard, cardPayloadFromDraft } from '@/lib/card-encoding';
import { CardInstallQR } from '@/components/shared/CardInstallQR';
import type { StyleOverrides } from '@/lib/templates/types';

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
};

interface StatusDraft {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
  facebook: string | null;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  messenger: string | null;
  templateId: string;
  styleOverrides: StyleOverrides;
}

interface OrderStatusProps {
  status: string;
  adminNotes?: string | null;
  draft?: StatusDraft | null;
  origin: string;
}

export function OrderStatus({ status, adminNotes, draft, origin }: OrderStatusProps) {
  const copy = STATUS_COPY[status] ?? { label: status, body: '' };
  const qrValue =
    status === 'approved' && draft ? `${origin}/holder/install#${encodeCard(cardPayloadFromDraft(draft))}` : null;

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
      {qrValue && <CardInstallQR value={qrValue} />}
    </div>
  );
}
