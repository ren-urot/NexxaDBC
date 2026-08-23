'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { saveCard, hasCard } from '@/lib/holder-storage';

type InstallState = 'checking' | 'saving' | 'success' | 'invalid' | 'error';

export default function HolderInstallPage() {
  const router = useRouter();
  const [state, setState] = useState<InstallState>('checking');

  useEffect(() => {
    (async () => {
      try {
        if (await hasCard()) {
          // Already saved on this device — a refresh or a repeat scan of the
          // same QR shouldn't re-process or error, just go straight in.
          router.replace('/holder');
          return;
        }
      } catch {
        setState('error');
        return;
      }

      const fragment = window.location.hash.slice(1);
      const payload = decodeCard(fragment);
      if (!payload) {
        setState('invalid');
        return;
      }

      setState('saving');
      try {
        await saveCard(payload);
      } catch {
        setState('error');
        return;
      }

      // The raw card data has done its job — clear it from the address bar
      // and history so it doesn't linger there once safely saved.
      window.history.replaceState(null, '', '/holder/install');
      setState('success');
      router.replace('/holder');
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
    <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
      {state === 'saving' ? 'Saving your card…' : 'Checking…'}
    </p>
  );
}
