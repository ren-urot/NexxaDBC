import type { Orientation } from '@/lib/templates/types';

/**
 * The "proof frame" — every live card preview sits inside registration crop
 * marks with a monospace slug line, like a printer's proof of a card before
 * it goes to press. It's the one signature device reused across the landing
 * page, the template gallery, and the builder itself.
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
      <div className="relative p-6">
        <span className="crop-mark crop-mark--tl" />
        <span className="crop-mark crop-mark--tr" />
        <span className="crop-mark crop-mark--bl" />
        <span className="crop-mark crop-mark--br" />
        <div className="flex items-center justify-center overflow-hidden rounded-sm bg-stock shadow-[0_1px_2px_rgba(23,25,29,0.06),0_12px_28px_-12px_rgba(23,25,29,0.25)]">
          {children}
        </div>
      </div>
      {label && (
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          {label}
        </p>
      )}
    </div>
  );
}
