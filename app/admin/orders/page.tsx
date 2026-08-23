'use client';

import { useEffect, useState } from 'react';
import { OrderTable } from '@/components/admin/OrderTable';

interface OrderRow {
  id: string;
  status: string;
  amount: number;
  paymentMethod: string | null;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(res => {
        if (!res.ok) {
          setError(true);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setOrders(data);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Admin</p>
      <h1 className="font-display text-3xl font-medium text-ink">Orders</h1>
      <a
        href="/api/admin/customer-history/export"
        className="mt-2 inline-block font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
      >
        Download customer history (CSV)
      </a>
      <div className="mt-8">
        {error ? (
          <p role="alert" className="text-sm text-error">
            Couldn&apos;t load orders. Try refreshing, or sign in again if your session expired.
          </p>
        ) : orders ? (
          <OrderTable orders={orders} />
        ) : (
          <p className="text-ink-soft">Loading…</p>
        )}
      </div>
    </main>
  );
}
