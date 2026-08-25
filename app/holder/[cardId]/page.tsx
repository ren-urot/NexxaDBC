'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getTemplate } from '@/lib/templates/registry';
import { CARD_QR_HORIZONTAL, CARD_QR_VERTICAL } from '@/lib/templates/qr-spec';
import { PhoneFrame } from '@/components/builder/PhoneFrame';
import { InstallAppButton } from '@/components/holder/InstallAppButton';
import { encodeCard, MAX_ENCODED_CARD_LENGTH } from '@/lib/card-encoding';
import { getCardById, type HolderCard } from '@/lib/holder-storage';

export default function HolderCardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = use(params);
  const [card, setCard] = useState<HolderCard | null | undefined>(undefined);
  const [showIosHint] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isIos && !isStandalone;
  });
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));

  useEffect(() => {
    (async () => {
      try {
        setCard(await getCardById(cardId));
      } catch {
        setCard(null);
      }
    })();
  }, [cardId]);

  if (card === undefined) {
    return (
      <main className="flex min-h-screen w-full flex-1 items-center justify-center bg-[#0b0b0c]">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/50">Loading…</p>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 bg-[#0b0b0c] px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">Digital Business Card</p>
        <h1 className="font-display text-3xl font-medium text-white">Card not found</h1>
        <p className="text-white/60">It may have been removed from this phone&apos;s card holder.</p>
        <Link href="/holder" className="mt-2 text-sm font-medium text-scan underline underline-offset-4">
          Back to My Card Holder
        </Link>
      </main>
    );
  }

  const template = getTemplate(card.templateId);
  const Component = template.component;
  const encoded = encodeCard({ data: card.data, style: card.style, templateId: card.templateId });
  const qrTooLarge = encoded.length > MAX_ENCODED_CARD_LENGTH;
  const qrValue = qrTooLarge ? null : `${origin}/holder/install#${encoded}`;
  const qrSpec = template.orientation === 'horizontal' ? CARD_QR_HORIZONTAL : CARD_QR_VERTICAL;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-1 flex-col items-center bg-[#0b0b0c] px-3 py-12">
      <div className="mb-6 flex w-full max-w-[350px] items-center gap-3">
        <Link
          href="/holder"
          aria-label="Back to My Card Holder"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">Digital Business Card</p>
          <h1 className="font-display text-xl font-medium text-white">
            {card.data.firstName} {card.data.lastName}
          </h1>
        </div>
      </div>

      <div className="w-full max-w-[350px]">
        <PhoneFrame orientation={template.orientation} rotateHorizontalToFill>
          {/* The QR lives on the card face itself — a printed-on-card
              code, the way a real, modern business card would carry
              one, not a separate digital widget bolted underneath. */}
          <div className="relative h-full w-full" data-qr-value={qrValue ?? undefined}>
            <Component data={card.data} style={card.style} />
            {qrValue && (
              <div
                className="absolute z-30 rounded-md bg-white p-1.5 shadow-md"
                style={{
                  bottom: `${qrSpec.bottom}px`,
                  ...('right' in qrSpec
                    ? { right: `${qrSpec.right}px` }
                    : { left: '50%', transform: 'translateX(-50%)' }),
                }}
              >
                <QRCodeSVG value={qrValue} size={qrSpec.size} />
              </div>
            )}
          </div>
        </PhoneFrame>
      </div>

      <div className="mt-6">
        <InstallAppButton />
      </div>
      {showIosHint && (
        <p className="mt-4 text-center text-sm text-white/50">
          On iPhone? Tap the Share button, then &quot;Add to Home Screen&quot; to install.
        </p>
      )}
    </main>
  );
}
