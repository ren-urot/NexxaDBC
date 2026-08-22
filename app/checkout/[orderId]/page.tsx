'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { PaymentQR } from '@/components/checkout/PaymentQR';
import { PaymentForm } from '@/components/checkout/PaymentForm';

interface OrderState {
  id: string;
  status: string;
  amount: number;
}

export default function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [method, setMethod] = useState<'gcash' | 'bank_transfer' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          if (!cancelled) setLoadFailed(true);
          return;
        }
        const body = await res.json();
        if (!cancelled) setOrder(body);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function handleSubmit({ reference, file }: { reference: string; file: File }) {
    if (!method) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('paymentMethod', method);
      form.set('paymentReference', reference);
      form.set('file', file);
      const res = await fetch(`/api/orders/${orderId}/payment`, { method: 'POST', body: form });
      if (!res.ok) {
        setError("We couldn't submit your payment. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/checkout/${orderId}/status`);
    } catch {
      setError("We couldn't submit your payment. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (loadFailed) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24" role="alert">
        <h1 className="font-display text-3xl font-medium text-ink">We couldn&apos;t find that order</h1>
        <p className="mt-2 text-ink-soft">The link may be incorrect, or the order may not belong to this browser.</p>
      </main>
    );
  }

  if (!order) return <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Loading…</p>;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Checkout</p>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink">₱{order.amount} — one time.</h1>
      <p className="mt-3 text-ink-soft">Pick a payment method, pay, and tell us the reference number.</p>

      <div className="mt-10 space-y-8">
        <PaymentMethodSelector value={method} onChange={setMethod} />
        {method && (
          <>
            <PaymentQR method={method} />
            <PaymentForm method={method} onSubmit={handleSubmit} submitting={submitting} />
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-[#b3452c]">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
