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
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-gray-600">
        We hit an unexpected problem. Your card draft is saved — try again, or start over from the
        template gallery.
      </p>
      <div className="flex gap-4">
        <button className="px-4 py-2 bg-black text-white rounded" onClick={() => retry()}>
          Try again
        </button>
        <Link className="px-4 py-2 underline" href="/templates">
          Browse templates
        </Link>
      </div>
    </main>
  );
}
