import type { StyleOverrides } from './types';

export const FONT_SIZE_SCALE = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

export function fontSizeClass(baseIndex: number, step: number = 0): string {
  const idx = Math.min(FONT_SIZE_SCALE.length - 1, Math.max(0, baseIndex + step));
  return FONT_SIZE_SCALE[idx];
}

export function resolveAccentColor(style: StyleOverrides, fallback: string): string {
  return style.accentColor ?? fallback;
}
