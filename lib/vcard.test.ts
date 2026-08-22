import { describe, it, expect } from 'vitest';
import { buildVCard } from './vcard';
import type { CardData } from '@/lib/templates/types';

const data: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('buildVCard', () => {
  it('produces a well-formed vCard 3.0 with required fields', () => {
    const vcard = buildVCard(data);
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:Juan Dela Cruz');
    expect(vcard).toContain('N:Dela Cruz;Juan;;;');
    expect(vcard).toContain('ORG:ABC Corporation');
    expect(vcard).toContain('TITLE:Sales Director');
    expect(vcard).toContain('TEL;TYPE=CELL:+639171234567');
    expect(vcard).toContain('EMAIL:juan@abc.com');
    expect(vcard).toContain('END:VCARD');
  });

  it('omits URL and ADR lines when website/address are absent', () => {
    const vcard = buildVCard(data);
    expect(vcard).not.toContain('URL:');
    expect(vcard).not.toContain('ADR');
  });

  it('includes URL and ADR when website/address are present', () => {
    const vcard = buildVCard({ ...data, website: 'https://abc.example.com', address: '123 Ayala Ave' });
    expect(vcard).toContain('URL:https://abc.example.com');
    expect(vcard).toContain('ADR;TYPE=WORK:;;123 Ayala Ave;;;;');
  });

  it('escapes commas and semicolons in field values', () => {
    const vcard = buildVCard({ ...data, company: 'ABC, Inc.; Makati' });
    expect(vcard).toContain('ORG:ABC\\, Inc.\\; Makati');
  });
});
