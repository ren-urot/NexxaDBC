import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { encodeCard, decodeCard, cardPayloadFromDraft, MAX_ENCODED_CARD_LENGTH } from './card-encoding';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

// A tiny deterministic PRNG (not crypto-secure, doesn't need to be) that
// produces non-repeating filler — unlike 'A'.repeat(n), this defeats
// lz-string's compression the way a genuine long name/address/URL would,
// since real text doesn't repeat a single character.
function randomIsh(length: number, seed: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  let x = seed;
  for (let i = 0; i < length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    result += chars[x % chars.length];
  }
  return result;
}

const fullData: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
  address: '123 Ayala Ave, Makati City',
  website: 'https://abc.example.com',
  logoUrl: 'https://blob.example.com/logos/juan.png',
  facebook: 'https://facebook.com/juan',
  linkedin: 'https://linkedin.com/in/juan',
  instagram: 'https://instagram.com/juan',
  whatsapp: '+639171234567',
  messenger: 'https://m.me/juan',
};
const style: StyleOverrides = { accentColor: '#1e3a8a', fontSizeStep: 1 };

describe('encodeCard / decodeCard', () => {
  it('round-trips a fully filled card', () => {
    const encoded = encodeCard({ data: fullData, style, templateId: 'corporate-vertical' });
    expect(decodeCard(encoded)).toEqual({ data: fullData, style, templateId: 'corporate-vertical' });
  });

  it('round-trips a card with no optional fields and no style overrides', () => {
    const minimal: CardData = {
      firstName: 'Ana',
      lastName: 'Reyes',
      jobTitle: 'Owner',
      company: 'Reyes Bakery',
      mobile: '+639170000000',
      email: 'ana@reyes.example',
    };
    const encoded = encodeCard({ data: minimal, style: {}, templateId: 'minimal-horizontal' });
    expect(decodeCard(encoded)).toEqual({ data: minimal, style: {}, templateId: 'minimal-horizontal' });
  });

  it('a worst-case fully-filled card with realistic (non-repeating) content exceeds the QR threshold', () => {
    // Builder's own field-length maximums, filled with high-entropy filler
    // instead of a repeated character — a repeated-character fixture
    // compresses to a tiny fraction of its raw size and would pass this
    // assertion vacuously, masking the real risk: genuine names/addresses/
    // URLs don't repeat and compress far less well. This worst case is
    // reachable by a real customer, not a synthetic edge case, since
    // Builder caps these fields by length only, not content.
    const worstCase: CardData = {
      firstName: randomIsh(100, 1),
      lastName: randomIsh(100, 2),
      jobTitle: randomIsh(150, 3),
      company: randomIsh(150, 4),
      mobile: randomIsh(30, 5),
      email: `${randomIsh(240, 6)}@example.com`,
      address: randomIsh(500, 7),
      website: `https://example.com/${randomIsh(230, 8)}`,
      logoUrl: `https://example.com/${randomIsh(230, 9)}`,
      facebook: `https://facebook.com/${randomIsh(230, 10)}`,
      linkedin: `https://linkedin.com/${randomIsh(230, 11)}`,
      instagram: `https://instagram.com/${randomIsh(230, 12)}`,
      whatsapp: randomIsh(30, 13),
      messenger: `https://m.me/${randomIsh(230, 14)}`,
    };
    const encoded = encodeCard({ data: worstCase, style, templateId: 'corporate-vertical' });
    // This genuinely exceeds the threshold — the QR-rendering call sites
    // are responsible for detecting this and falling back to an
    // explanatory message instead of crashing (see OrderStatus.tsx and
    // the admin order-detail page). This test only proves the threshold
    // catches the real worst case; it is not asserting encoding always
    // produces a renderable QR.
    expect(encoded.length).toBeGreaterThan(MAX_ENCODED_CARD_LENGTH);
    // Still round-trips correctly even though it's too large for a QR —
    // decodeCard has no size limit of its own, only the QR-rendering layer
    // does.
    expect(decodeCard(encoded)).toEqual({ data: worstCase, style, templateId: 'corporate-vertical' });
  });

  it('a realistic (non-adversarial) fully-filled card fits comfortably under the QR threshold', () => {
    // A believable real-world maximum — full name, a long job title, a
    // genuine long address, a few social profile URLs — should NOT trip
    // the overflow fallback. This is what the original (now-replaced) test
    // intended to prove, done honestly this time.
    const believableFull: CardData = {
      firstName: 'Maria Anunciacion',
      lastName: 'Dela Cruz-Santos',
      jobTitle: 'Senior Vice President of Business Development',
      company: 'ABC Corporation International Holdings, Inc.',
      mobile: '+639171234567',
      email: 'maria.delacruz.santos@abccorporation.com',
      address: '123 Ayala Avenue, Makati City, Metro Manila, Philippines 1226',
      website: 'https://www.abccorporation.com',
      logoUrl: 'https://blob.example.com/logos/juan-abc123.png',
      facebook: 'https://facebook.com/abccorporation',
      linkedin: 'https://linkedin.com/in/maria-delacruz-santos',
      instagram: 'https://instagram.com/abccorp',
      whatsapp: '+639171234567',
      messenger: 'https://m.me/abccorporation',
    };
    const encoded = encodeCard({ data: believableFull, style, templateId: 'corporate-vertical' });
    expect(encoded.length).toBeLessThan(MAX_ENCODED_CARD_LENGTH);
  });

  it('returns null for garbage input', () => {
    expect(decodeCard('not-valid-lz-string-data!!!')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeCard('')).toBeNull();
  });

  it('returns null for a wrong schema version', () => {
    const bad = compressToEncodedURIComponent(
      JSON.stringify({ v: 999, fn: 'A', ln: 'B', jt: 'C', co: 'D', mo: 'E', em: 'F', tp: 'corporate-vertical', or: 'vertical' })
    );
    expect(decodeCard(bad)).toBeNull();
  });

  it('returns null for an unknown template id', () => {
    const bad = compressToEncodedURIComponent(
      JSON.stringify({ v: 1, fn: 'A', ln: 'B', jt: 'C', co: 'D', mo: 'E', em: 'F', tp: 'not-a-real-template', or: 'vertical' })
    );
    expect(decodeCard(bad)).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    const bad = compressToEncodedURIComponent(
      JSON.stringify({ v: 1, fn: 'A', ln: 'B', jt: 'C', co: 'D', mo: 'E', tp: 'corporate-vertical', or: 'vertical' })
    );
    expect(decodeCard(bad)).toBeNull();
  });

  it('returns null when the claimed orientation does not match the template', () => {
    const bad = compressToEncodedURIComponent(
      // corporate-vertical is actually vertical
      JSON.stringify({ v: 1, fn: 'A', ln: 'B', jt: 'C', co: 'D', mo: 'E', em: 'f@x.com', tp: 'corporate-vertical', or: 'horizontal' })
    );
    expect(decodeCard(bad)).toBeNull();
  });

  it('round-trips a card with fontSizeStep of 0 (falsy but valid)', () => {
    const data: CardData = {
      firstName: 'Test',
      lastName: 'User',
      jobTitle: 'Developer',
      company: 'Test Corp',
      mobile: '+1234567890',
      email: 'test@example.com',
    };
    const styleWithZero: StyleOverrides = { fontSizeStep: 0 };
    const encoded = encodeCard({ data, style: styleWithZero, templateId: 'corporate-vertical' });
    expect(decodeCard(encoded)).toEqual({ data, style: styleWithZero, templateId: 'corporate-vertical' });
  });

  it('returns null for a wrong-typed optional field (fs as string instead of number)', () => {
    const bad = compressToEncodedURIComponent(
      JSON.stringify({ v: 1, fn: 'A', ln: 'B', jt: 'C', co: 'D', mo: 'E', em: 'f@x.com', tp: 'corporate-vertical', or: 'vertical', fs: 'not-a-number' })
    );
    expect(decodeCard(bad)).toBeNull();
  });

  it('returns null for a wrong-typed optional string field (accentColor as object)', () => {
    const bad = compressToEncodedURIComponent(
      JSON.stringify({ v: 1, fn: 'A', ln: 'B', jt: 'C', co: 'D', mo: 'E', em: 'f@x.com', tp: 'corporate-vertical', or: 'vertical', ac: {} })
    );
    expect(decodeCard(bad)).toBeNull();
  });
});

describe('cardPayloadFromDraft', () => {
  it('maps a draft row to an encodable payload, converting nulls to undefined/empty as CardData expects', () => {
    const draft = {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales Director',
      company: 'ABC Corporation',
      mobile: '+639171234567',
      email: 'juan@abc.com',
      address: null,
      website: null,
      logoUrl: null,
      facebook: null,
      linkedin: null,
      instagram: null,
      whatsapp: null,
      messenger: null,
      templateId: 'corporate-vertical',
      styleOverrides: {},
    };
    const payload = cardPayloadFromDraft(draft);
    expect(payload.data.firstName).toBe('Juan');
    expect(payload.data.address).toBeUndefined();
    expect(payload.templateId).toBe('corporate-vertical');
    expect(payload.style).toEqual({});
  });
});
