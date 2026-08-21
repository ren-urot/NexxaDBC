'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateGallery } from '@/components/builder/TemplateGallery';

export default function TemplatesPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(templateId: string, orientation: string) {
    setError(null);
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId, orientation }),
      });

      // Without this guard a failed POST navigates to /builder/undefined,
      // which crashes the builder page.
      if (!res.ok) {
        setError("We couldn't start your card. Please try again.");
        return;
      }

      const draft = await res.json();
      if (!draft?.id) {
        setError("We couldn't start your card. Please try again.");
        return;
      }

      router.push(`/builder/${draft.id}`);
    } catch {
      setError("We couldn't start your card. Check your connection and try again.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Specimen book</p>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink">Choose your stock.</h1>
      <p className="mt-3 max-w-lg text-ink-soft">
        Ten templates, five houses, two formats. Every proof below is the real thing — no
        placeholders swapped in later.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-sm border border-ink/20 bg-stock px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}
      <div className="mt-10">
        <TemplateGallery onSelect={handleSelect} />
      </div>
    </main>
  );
}
