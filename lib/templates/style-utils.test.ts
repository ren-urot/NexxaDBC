import { describe, it, expect } from 'vitest';
import { fontSizeClass, resolveAccentColor, whatsappUrl, FONT_SIZE_SCALE } from './style-utils';

describe('fontSizeClass', () => {
  it('returns the base class with no step', () => {
    expect(fontSizeClass(2)).toBe(FONT_SIZE_SCALE[2]);
  });

  it('applies a positive step', () => {
    expect(fontSizeClass(2, 1)).toBe(FONT_SIZE_SCALE[3]);
  });

  it('clamps below zero', () => {
    expect(fontSizeClass(0, -1)).toBe(FONT_SIZE_SCALE[0]);
  });

  it('clamps above the top of the scale', () => {
    expect(fontSizeClass(FONT_SIZE_SCALE.length - 1, 5)).toBe(FONT_SIZE_SCALE[FONT_SIZE_SCALE.length - 1]);
  });
});

describe('resolveAccentColor', () => {
  it('returns the override when set', () => {
    expect(resolveAccentColor({ accentColor: '#112233' }, '#000000')).toBe('#112233');
  });

  it('returns the fallback when unset', () => {
    expect(resolveAccentColor({}, '#000000')).toBe('#000000');
  });
});

describe('whatsappUrl', () => {
  it('builds a wa.me link from a formatted phone number', () => {
    expect(whatsappUrl('+63 917 123 4567')).toBe('https://wa.me/639171234567');
  });

  it('strips punctuation from a phone number', () => {
    expect(whatsappUrl('(0917) 123-4567')).toBe('https://wa.me/09171234567');
  });

  it('passes an already-complete URL through untouched', () => {
    expect(whatsappUrl('https://wa.me/639171234567')).toBe('https://wa.me/639171234567');
  });
});
