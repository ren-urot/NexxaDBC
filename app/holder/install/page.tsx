'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { saveCard, getCards, isSameCard, type HolderCard } from '@/lib/holder-storage';

type InstallState = 'checking' | 'saving' | 'success' | 'invalid' | 'error';

function Spinner() {
  return (
    <svg className="h-9 w-9 animate-spin text-scan" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

// Scanning the QR is the entire transfer — no separate download or install
// step, no tap required. The card is saved to this phone's holder the
// instant the scan lands here. A phone's home-screen app icon is a
// different thing: no browser, on any platform, will ever add one without
// a direct tap on an explicit button — that's a security boundary the
// platform enforces, not something this flow can route around. That
// optional tap lives on the card page itself (InstallAppButton) and never
// blocks or delays getting the card.
export default function HolderInstallPage() {
  const router = useRouter();
  const [state, setState] = useState<InstallState>('checking');
  // React 18 Strict Mode runs a mount effect, its cleanup, then the effect
  // again — intentionally, to catch effects that aren't safe to re-run. This
  // one is not idempotent (it writes to IndexedDB), so without this guard
  // the second invocation saw the same "no existing match yet" snapshot as
  // the first and saved a duplicate card before either write had committed.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const fragment = window.location.hash.slice(1);
      const payload = decodeCard(fragment);

      let existingCards: HolderCard[] = [];
      try {
        existingCards = await getCards();
      } catch {
        setState('error');
        return;
      }

      const existingMatch = payload ? existingCards.find(c => isSameCard(c, payload)) : undefined;
      if (existingMatch) {
        // Already in this phone's card holder — a refresh or a repeat scan
        // of the same QR shouldn't add a duplicate, just show the one
        // that's already there.
        router.replace(`/holder/${existingMatch.id}`);
        return;
      }

      if (!payload) {
        setState('invalid');
        return;
      }

      setState('saving');
      let saved: HolderCard;
      try {
        saved = await saveCard(payload);
      } catch {
        setState('error');
        return;
      }

      // The raw card data has done its job — clear it from the address bar
      // and history so it doesn't linger there once safely saved.
      window.history.replaceState(null, '', '/holder/install');
      setState('success');
      router.replace(`/holder/${saved.id}`);
    })();
  }, [router]);

  if (state === 'invalid') {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 role="alert" className="font-display text-3xl font-medium text-ink">
          This code isn&apos;t valid
        </h1>
        <p className="text-ink-soft">Ask for a new one and scan it again.</p>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 role="alert" className="font-display text-3xl font-medium text-ink">
          Couldn&apos;t save your card
        </h1>
        <p className="text-ink-soft">Scan the code again to retry.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <Spinner />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
        {state === 'saving' ? 'Saving your card…' : 'Checking…'}
      </p>
    </main>
  );
}
