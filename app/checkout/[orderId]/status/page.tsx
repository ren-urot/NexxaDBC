'use client';

import { use, useEffect, useState } from 'react';
import { OrderStatus } from '@/components/checkout/OrderStatus';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { PaymentQR } from '@/components/checkout/PaymentQR';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface OrderState {
  id: string;
  status: string;
  amount: number;
  adminNotes: string | null;
  draft: {
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
    styleOverrides: { accentColor?: string; fontSizeStep?: number };
  } | null;
}

export default function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [method, setMethod] = useState<'gcash' | 'bank_transfer' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));

  async function load() {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        setLoadFailed(true);
        return;
      }
      setOrder(await res.json());
    } catch {
      setLoadFailed(true);
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [orderId]);

  async function handleResubmit({ reference, file }: { reference: string; file: File }) {
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
      await load();
      setSubmitting(false);
    } catch {
      setError("We couldn't submit your payment. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (loadFailed) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-xl flex-1 px-6 py-24" role="alert">
          <h1 className="font-display text-3xl font-medium text-ink">We couldn&apos;t find that order</h1>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <SiteHeader />
        <p className="flex-1 p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Loading…</p>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Order status</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-ink">₱{order.amount}</h1>

        <div className="mt-10">
          <OrderStatus status={order.status} adminNotes={order.adminNotes} draft={order.draft} origin={origin} />
        </div>

        {order.status === 'rejected' && (
          <div className="mt-8 space-y-8">
            <PaymentMethodSelector value={method} onChange={setMethod} />
            {method && (
              <>
                <PaymentQR method={method} />
                <PaymentForm method={method} onSubmit={handleResubmit} submitting={submitting} />
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
