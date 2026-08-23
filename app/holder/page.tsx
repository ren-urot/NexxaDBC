'use client';

import { useEffect, useState } from 'react';
import { getTemplate } from '@/lib/templates/registry';
import { PhoneFrame } from '@/components/builder/PhoneFrame';
import { CardActions } from '@/components/holder/CardActions';
import { getCard, type HolderCard } from '@/lib/holder-storage';

export default function HolderPage() {
  const [card, setCard] = useState<HolderCard | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setCard(await getCard());
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
    </main>
  );
}
