'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // Next.js 16 names this prop `retry` (it was `reset` in earlier versions).
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">Press error</p>
      <h1 className="font-display text-3xl font-medium text-ink">Something went wrong</h1>
      <p className="text-ink-soft">
        We hit an unexpected problem. Your card draft is saved — try again, or start over from the
        template gallery.
      </p>
      <div className="mt-2 flex items-center gap-6">
        <button
          onClick={() => retry()}
          className="rounded-full bg-ink px-5 py-2.5 font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Try again
        </button>
        <Link
          href="/templates"
          className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan"
        >
          Browse templates
        </Link>
      </div>
    </main>
  );
}
