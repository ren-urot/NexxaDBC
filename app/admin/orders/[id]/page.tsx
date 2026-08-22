'use client';

import { use, useEffect, useState } from 'react';
import { ProvisioningQR } from '@/components/admin/ProvisioningQR';

interface OrderDetail {
  id: string;
  status: string;
  amount: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  adminNotes: string | null;
  provisioningToken: string | null;
  provisioningTokenStatus: string | null;
  draft: { firstName: string; lastName: string; company: string; email: string } | null;
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function load() {
    const res = await fetch(`/api/admin/orders/${id}`);
    if (res.ok) setOrder(await res.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}${path}`, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        setError('That action failed. Please try again.');
        setBusy(false);
        return;
      }
      await load();
      setBusy(false);
    } catch {
      setError('That action failed. Check your connection and try again.');
      setBusy(false);
    }
  }

  if (!order) return <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Loading…</p>;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Order · {order.status}</p>
      <h1 className="font-display text-3xl font-medium text-ink">
        {order.draft ? `${order.draft.firstName} ${order.draft.lastName}` : 'Order'}
      </h1>
      <div className="mt-8 space-y-2 text-ink-soft">
        <p>{order.draft?.company}</p>
        <p>{order.draft?.email}</p>
        <p>Method: {order.paymentMethod ?? '—'}</p>
        <p>Reference: {order.paymentReference ?? '—'}</p>
      </div>

      {order.paymentProofUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={order.paymentProofUrl} alt="Payment proof" className="mt-6 max-w-xs rounded-sm border border-line" />
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[#b3452c]">
          {error}
        </p>
      )}

      {order.status === 'submitted' && (
        <div className="mt-8 space-y-4">
          <button
            onClick={() => act('/approve')}
            disabled={busy}
            className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            Approve
          </button>
          <div className="space-y-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                Rejection note
              </span>
              <input
                aria-label="Rejection note"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1.5 w-full border-b border-line bg-transparent py-1.5 text-[15px] text-ink focus:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
              />
            </label>
            <button
              onClick={() => act('/reject', { notes })}
              disabled={busy || !notes.trim()}
              className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {order.status === 'approved' && order.provisioningToken && (
        <div className="mt-8 space-y-4">
          {order.provisioningTokenStatus === 'active' && (
            <ProvisioningQR token={order.provisioningToken} origin={origin} />
          )}
          <div className="flex gap-4">
            <button
              onClick={() => act('/provisioning-qr/regenerate')}
              disabled={busy}
              className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan disabled:opacity-50"
            >
              Regenerate QR
            </button>
            <button
              onClick={() => act('/provisioning-qr/expire')}
              disabled={busy}
              className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan disabled:opacity-50"
            >
              Expire QR
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
