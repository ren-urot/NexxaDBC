'use client';

import { QRCodeSVG } from 'qrcode.react';

export function ProvisioningQR({ token, origin }: { token: string; origin: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-stock p-6">
      <QRCodeSVG value={`${origin}/provision/${token}`} size={200} />
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        {origin}/provision/{token.slice(0, 8)}…
      </p>
    </div>
  );
}
