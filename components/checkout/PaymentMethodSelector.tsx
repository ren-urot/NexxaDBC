'use client';

interface PaymentMethodSelectorProps {
  value: 'gcash' | 'bank_transfer' | null;
  onChange: (method: 'gcash' | 'bank_transfer') => void;
}

const METHODS: { value: 'gcash' | 'bank_transfer'; label: string }[] = [
  { value: 'gcash', label: 'GCash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Payment method">
      {METHODS.map(m => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          onClick={() => onChange(m.value)}
          className={`rounded-full border px-5 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan ${
            value === m.value ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:text-ink'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
