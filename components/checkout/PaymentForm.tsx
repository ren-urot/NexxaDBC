'use client';

import { useState } from 'react';

interface PaymentFormProps {
  method: 'gcash' | 'bank_transfer';
  onSubmit: (data: { reference: string; file: File }) => Promise<void>;
  submitting: boolean;
}

export function PaymentForm({ method, onSubmit, submitting }: PaymentFormProps) {
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reference.trim()) {
      setError('Enter your payment reference number.');
      return;
    }
    if (!file) {
      setError('Upload a screenshot of your payment.');
      return;
    }
    await onSubmit({ reference, file });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          {method === 'gcash' ? 'GCash reference number' : 'Bank transfer reference'}
        </span>
        <input
          aria-label="Payment reference"
          value={reference}
          onChange={e => setReference(e.target.value)}
          className="mt-1.5 w-full border-b border-line bg-transparent py-1.5 text-[15px] text-ink focus:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">Payment screenshot</span>
        <input
          aria-label="Payment screenshot"
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:tracking-[0.1em] file:text-paper"
        />
      </label>
      {error && (
        <span role="alert" className="block text-sm text-[#b3452c]">
          {error}
        </span>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : "I've paid — submit for review"}
      </button>
    </form>
  );
}
