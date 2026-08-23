import type { Orientation } from '@/lib/templates/types';

/**
 * The card preview frame — a soft-shadowed rounded card, reused across the
 * landing page, the template gallery, and the builder itself.
 */
export function PhoneFrame({
  orientation,
  label,
  children,
}: {
  orientation: Orientation;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto ${orientation === 'vertical' ? 'w-[320px]' : 'w-[560px]'}`}>
      <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-stock shadow-[0_2px_8px_rgba(23,23,23,0.06),0_20px_40px_-16px_rgba(255,90,31,0.25)]">
        {children}
      </div>
      {label && (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      )}
    </div>
  );
}
