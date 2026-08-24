import type { CSSProperties } from 'react';
import type { StyleOverrides } from './types';

export const FONT_SIZE_SCALE = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const FONT_SIZE_PX: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
};

export function fontSizeClass(baseIndex: number, step: number = 0): string {
  const idx = Math.min(FONT_SIZE_SCALE.length - 1, Math.max(0, baseIndex + step));
  return FONT_SIZE_SCALE[idx];
}

const COMPANY_NAME_FONT_SCALE = 1.4;
const COMPANY_NAME_MARGIN_BOTTOM_PX = 35;

/**
 * Company name is sized at 140% of the template's normal step-scaled size,
 * with a fixed 35px bottom margin below it, applied as an inline style
 * (rather than a Tailwind size class) since 140% doesn't land on any step
 * in FONT_SIZE_SCALE.
 */
export function companyNameStyle(baseIndex: number, step: number = 0): CSSProperties {
  const px = FONT_SIZE_PX[fontSizeClass(baseIndex, step)];
  return {
    fontSize: `${px * COMPANY_NAME_FONT_SCALE}px`,
    marginBottom: `${COMPANY_NAME_MARGIN_BOTTOM_PX}px`,
  };
}

export function resolveAccentColor(style: StyleOverrides, fallback: string): string {
  return style.accentColor ?? fallback;
}

/**
 * Builds a WhatsApp deep link from the stored value.
 *
 * The WhatsApp field is captured (and validated) as a phone number, so using it
 * directly as an href turned it into a broken relative link on the rendered
 * card. Digits are extracted and prefixed with wa.me; a value the user pasted as
 * a full URL is passed through untouched.
 */
export function whatsappUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}
