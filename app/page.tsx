import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto flex flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Digital Business Card Builder</h1>
      <p className="text-lg text-gray-600">
        Pick a template, fill in your details, and see your card come together in a live preview —
        no design work required.
      </p>
      <div>
        <Link
          className="inline-block rounded bg-black px-5 py-3 font-medium text-white"
          href="/templates"
        >
          Create my card
        </Link>
      </div>
    </main>
  );
}
