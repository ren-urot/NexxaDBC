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
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Choose a template</h1>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      <TemplateGallery onSelect={handleSelect} />
    </main>
  );
}
