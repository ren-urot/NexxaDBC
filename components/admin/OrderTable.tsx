import Link from 'next/link';

interface OrderTableRow {
  id: string;
  status: string;
  amount: number;
  paymentMethod: string | null;
  createdAt: string;
}

export function OrderTable({ orders }: { orders: OrderTableRow[] }) {
  if (orders.length === 0) {
    return <p className="text-ink-soft">No orders yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          <th className="py-2 pr-4">Order</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Method</th>
          <th className="py-2 pr-4">Amount</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id} className="border-b border-line">
            <td className="py-3 pr-4 font-mono text-xs text-ink-soft">{o.id.slice(0, 8)}</td>
            <td className="py-3 pr-4 text-ink">{o.status}</td>
            <td className="py-3 pr-4 text-ink-soft">{o.paymentMethod ?? '—'}</td>
            <td className="py-3 pr-4 text-ink">₱{o.amount}</td>
            <td className="py-3">
              <Link
                href={`/admin/orders/${o.id}`}
                className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan"
              >
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
