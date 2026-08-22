import type { CardData } from '@/lib/templates/types';

function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export function buildVCard(data: CardData): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardValue(data.lastName)};${escapeVCardValue(data.firstName)};;;`,
    `FN:${escapeVCardValue(`${data.firstName} ${data.lastName}`)}`,
    `ORG:${escapeVCardValue(data.company)}`,
    `TITLE:${escapeVCardValue(data.jobTitle)}`,
    `TEL;TYPE=CELL:${escapeVCardValue(data.mobile)}`,
    `EMAIL:${escapeVCardValue(data.email)}`,
  ];
  if (data.website) lines.push(`URL:${escapeVCardValue(data.website)}`);
  if (data.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(data.address)};;;;`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}
