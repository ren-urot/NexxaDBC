import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist, or the card draft behind it has expired.
      </p>
      <Link className="underline" href="/templates">
        Browse templates
      </Link>
    </main>
  );
}
