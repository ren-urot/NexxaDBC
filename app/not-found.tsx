import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">404 · Out of stock</p>
      <h1 className="font-display text-3xl font-medium text-ink">Page not found</h1>
      <p className="text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist, or the card draft behind it has expired.
      </p>
      <Link
        href="/templates"
        className="mt-2 inline-block w-fit font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan"
      >
        Browse templates
      </Link>
    </main>
  );
}
