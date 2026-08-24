import type { Orientation } from '@/lib/templates/types';

// The templates themselves are laid out at fixed pixel dimensions (real
// business-card proportions), which is fine on desktop but overflows a
// phone's portrait width for a horizontal card. Rather than requiring the
// device be rotated to landscape to see the whole thing, this frame scales
// the card down to fit whatever width it's given — a photograph of a
// physical card sized to the frame, not the frame forced to match the card.
export const CARD_DIMENSIONS: Record<Orientation, { width: number; height: number }> = {
  vertical: { width: 320, height: 560 },
  horizontal: { width: 560, height: 320 },
};

/**
 * The card preview frame — a soft-shadowed rounded card, reused across the
 * landing page, the template gallery, and the builder itself.
 *
 * `rotateHorizontalToFill` is for the one place a horizontal card is the
 * only thing on an otherwise-empty phone screen (the Holder page): instead
 * of shrinking a landscape card to fit a portrait screen's width — which
 * leaves it small, with a lot of dead space below — it's rotated 90° so the
 * card's long edge runs down the screen's long edge, filling far more of
 * it. The builder's live preview never sets this: while editing, the card
 * should read the same way it's designed, not sideways.
 */
export function PhoneFrame({
  orientation,
  label,
  children,
  rotateHorizontalToFill = false,
}: {
  orientation: Orientation;
  label?: string;
  children: React.ReactNode;
  rotateHorizontalToFill?: boolean;
}) {
  const { width, height } = CARD_DIMENSIONS[orientation];
  const rotate = rotateHorizontalToFill && orientation === 'horizontal';
  // Rotated 90° around its own center, a width×height box's visual
  // footprint becomes height×width — that swapped box is what needs to
  // fill the available width and what the surrounding layout should
  // reserve space for.
  const boxWidth = rotate ? height : width;
  const boxHeight = rotate ? width : height;

  return (
    <div
      className={`mx-auto w-full ${boxWidth === 320 ? 'max-w-[320px]' : 'max-w-[560px]'}`}
      style={{ containerType: 'inline-size' } as React.CSSProperties}
    >
      <div
        className={`overflow-hidden rounded-2xl bg-stock shadow-[0_2px_8px_rgba(23,23,23,0.06),0_20px_40px_-16px_rgba(255,90,31,0.25)] ${rotate ? 'flex items-center justify-center' : ''}`}
        style={{ aspectRatio: `${boxWidth} / ${boxHeight}` }}
      >
        <div
          style={
            {
              width: `${width}px`,
              height: `${height}px`,
              scale: `calc(100cqi / ${boxWidth}px)`,
              rotate: rotate ? '90deg' : undefined,
              transformOrigin: rotate ? 'center' : 'top left',
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </div>
      {label && (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      )}
    </div>
  );
}
