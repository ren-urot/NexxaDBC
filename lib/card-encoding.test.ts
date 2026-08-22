import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { encodeCard, decodeCard, cardPayloadFromDraft } from './card-encoding';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

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

  it('compresses a worst-case fully-filled card to a size a QR code can actually hold', () => {
    const worstCase: CardData = {
      firstName: 'A'.repeat(100),
      lastName: 'B'.repeat(100),
      jobTitle: 'C'.repeat(150),
      company: 'D'.repeat(150),
      mobile: '1'.repeat(30),
      email: `${'e'.repeat(240)}@example.com`,
      address: 'F'.repeat(500),
      website: `https://example.com/${'g'.repeat(230)}`,
      logoUrl: `https://example.com/${'h'.repeat(230)}`,
      facebook: `https://facebook.com/${'i'.repeat(230)}`,
      linkedin: `https://linkedin.com/${'j'.repeat(230)}`,
      instagram: `https://instagram.com/${'k'.repeat(230)}`,
      whatsapp: '9'.repeat(30),
      messenger: `https://m.me/${'l'.repeat(230)}`,
    };
    const encoded = encodeCard({ data: worstCase, style, templateId: 'corporate-vertical' });
    // Version 40 QR at error-correction level L holds 2,953 bytes in byte
    // mode — the most permissive level. Encoded output must fit comfortably
    // under that even in this worst case.
    expect(encoded.length).toBeLessThan(2953);
    expect(decodeCard(encoded)).toEqual({ data: worstCase, style, templateId: 'corporate-vertical' });
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
