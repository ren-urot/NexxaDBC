'use client';

import { useEffect, useState } from 'react';
import { getTemplate } from '@/lib/templates/registry';
import { PhoneFrame } from '@/components/builder/PhoneFrame';
import { CardActions } from '@/components/holder/CardActions';
import { getCard, type HolderCard } from '@/lib/holder-storage';

export default function HolderPage() {
  const [card, setCard] = useState<HolderCard | null | undefined>(undefined);
  // Lazy initializer rather than an effect + setState: this page's JSX only
  // ever renders past the "Loading…" state once `card` resolves (below),
  // which happens strictly after mount — so this value is never part of the
  // server/client hydration comparison and doesn't need effect-based
  // deferral. Matches the existing `origin` pattern in
  // app/admin/orders/[id]/page.tsx.
  const [showIosHint] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isIos && !isStandalone;
  });

  useEffect(() => {
    (async () => {
      try {
        setCard(await getCard());
      } catch {
        setCard(null);
      }
    })();
  }, []);

  if (card === undefined) {
    return <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Loading…</p>;
  }

  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">DBC Holder</p>
        <h1 className="font-display text-3xl font-medium text-ink">No card yet</h1>
        <p className="text-ink-soft">Scan your provisioning QR to add a card to this phone.</p>
      </main>
    );
  }

  const template = getTemplate(card.templateId);
  const Component = template.component;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">DBC Holder</p>
      <PhoneFrame orientation={template.orientation}>
        <Component data={card.data} style={card.style} />
      </PhoneFrame>
      <CardActions data={card.data} />
      {showIosHint && (
        <p className="mt-4 text-center text-sm text-ink-soft">
          On iPhone? Tap the Share button, then &quot;Add to Home Screen&quot; to install.
        </p>
      )}
    </main>
  );
}
