'use client';

import { QRCodeSVG } from 'qrcode.react';

export function CardInstallQR({ value }: { value: string }) {
  return (
    <div
      data-qr-value={value}
      className="flex flex-col items-center gap-3 rounded-sm border border-line bg-stock p-6"
    >
      <QRCodeSVG value={value} size={200} />
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">Scan to add to your phone</p>
    </div>
  );
}
