'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmittedPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) {
        setError("We couldn't start checkout. Please try again.");
        setLoading(false);
        return;
      }
      const order = await res.json();
      router.push(`/checkout/${order.id}`);
    } catch {
      setError("We couldn't start checkout. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">Approved for press</p>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink">
        Thanks — your card is ready for checkout.
      </h1>
      <p className="text-ink-soft">One-time payment, no subscription.</p>
      {error && (
        <p role="alert" className="text-sm text-[#b3452c]">
          {error}
        </p>
      )}
      <button
        onClick={handleContinue}
        disabled={loading}
        className="mt-2 rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
      >
        {loading ? 'Starting checkout…' : 'Continue to payment'}
      </button>
    </main>
  );
}
