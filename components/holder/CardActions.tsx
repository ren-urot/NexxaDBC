'use client';

import { useState } from 'react';
import { buildVCard } from '@/lib/vcard';
import type { CardData } from '@/lib/templates/types';

export function CardActions({ data }: { data: CardData }) {
  const [shareError, setShareError] = useState<string | null>(null);

  function handleSaveContact() {
    const vcard = buildVCard(data);
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.firstName}-${data.lastName}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setShareError(null);
    const shareData = {
      title: `${data.firstName} ${data.lastName}`,
      text: `${data.jobTitle} at ${data.company}`,
      url: `${window.location.origin}/holder`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareError("Link copied. Your browser can't open the share sheet directly.");
    } catch {
      setShareError("Couldn't share or copy the link.");
    }
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={handleSaveContact}
          className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
        >
          Save to Contacts
        </button>
        <button
          onClick={handleShare}
          className="rounded-full border border-line px-6 py-3 font-medium text-ink transition-colors hover:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
        >
          Share
        </button>
      </div>
      {shareError && (
        <p role="status" className="text-center text-sm text-ink-soft">
          {shareError}
        </p>
      )}
    </div>
  );
}
