import type { StyleOverrides } from './types';

export const FONT_SIZE_SCALE = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

export function fontSizeClass(baseIndex: number, step: number = 0): string {
  const idx = Math.min(FONT_SIZE_SCALE.length - 1, Math.max(0, baseIndex + step));
  return FONT_SIZE_SCALE[idx];
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
