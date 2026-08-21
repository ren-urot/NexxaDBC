export default function SubmittedPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">Approved for press</p>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink">
        Thanks — your card is ready for checkout.
      </h1>
      <p className="text-ink-soft">Payment and provisioning happen in the next step (coming soon).</p>
    </main>
  );
}
