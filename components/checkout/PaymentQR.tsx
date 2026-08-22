'use client';

import { QRCodeSVG } from 'qrcode.react';

const DEMO_PAYMENT_INFO: Record<'gcash' | 'bank_transfer', { label: string; value: string }> = {
  gcash: {
    label: 'GCash · Demo',
    value: 'GCash: 0917 123 4567 — DBC Demo Merchant (DEMO ONLY)',
  },
  bank_transfer: {
    label: 'Bank Transfer · Demo',
    value: 'Bank: DBC Demo Bank\nAccount: 0011-2233-44\nName: DBC Demo Merchant (DEMO ONLY)',
  },
};

export function PaymentQR({ method }: { method: 'gcash' | 'bank_transfer' }) {
  const info = DEMO_PAYMENT_INFO[method];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-sm border border-line bg-stock p-4">
        <QRCodeSVG value={info.value} size={180} />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">{info.label}</p>
    </div>
  );
}
