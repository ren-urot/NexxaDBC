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

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(res => res.json())
      .then(setOrders);
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Admin</p>
      <h1 className="font-display text-3xl font-medium text-ink">Orders</h1>
      <div className="mt-8">
        {orders ? <OrderTable orders={orders} /> : <p className="text-ink-soft">Loading…</p>}
      </div>
    </main>
  );
}
