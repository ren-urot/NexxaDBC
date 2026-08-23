import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { getTemplate } from '@/lib/templates/registry';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

const SCHEMA_VERSION = 1;

// qrcode.react (this app's only QR renderer) defaults to error-correction
// level L, whose byte-mode capacity tops out at 2,953 bytes — a card with
// long optional fields (address, several social URLs, none of which
// Builder currently caps) can exceed that and throw during render. This
// threshold leaves headroom below the hard limit for the
// `{origin}/holder/install#` prefix both QR-rendering call sites wrap the
// encoded value in.
export const MAX_ENCODED_CARD_LENGTH = 2700;

export interface EncodedCardPayload {
  data: CardData;
  style: StyleOverrides;
  templateId: string;
}

interface RawPayload {
  v: number;
  fn: string;
  ln: string;
  jt: string;
  co: string;
  mo: string;
  em: string;
  tp: string;
  or: string;
  ad?: string;
  ws?: string;
  lg?: string;
  fb?: string;
  li?: string;
  ig?: string;
  wa?: string;
  ms?: string;
  ac?: string;
  fs?: number;
}

export function encodeCard(payload: EncodedCardPayload): string {
  const raw: RawPayload = {
    v: SCHEMA_VERSION,
    fn: payload.data.firstName,
    ln: payload.data.lastName,
    jt: payload.data.jobTitle,
    co: payload.data.company,
    mo: payload.data.mobile,
    em: payload.data.email,
    tp: payload.templateId,
    or: getTemplate(payload.templateId).orientation,
  };
  if (payload.data.address) raw.ad = payload.data.address;
  if (payload.data.website) raw.ws = payload.data.website;
  if (payload.data.logoUrl) raw.lg = payload.data.logoUrl;
  if (payload.data.facebook) raw.fb = payload.data.facebook;
  if (payload.data.linkedin) raw.li = payload.data.linkedin;
  if (payload.data.instagram) raw.ig = payload.data.instagram;
  if (payload.data.whatsapp) raw.wa = payload.data.whatsapp;
  if (payload.data.messenger) raw.ms = payload.data.messenger;
  if (payload.style.accentColor) raw.ac = payload.style.accentColor;
  if (payload.style.fontSizeStep !== undefined) raw.fs = payload.style.fontSizeStep;

  return compressToEncodedURIComponent(JSON.stringify(raw));
}

export function decodeCard(encoded: string): EncodedCardPayload | null {
  if (!encoded) return null;

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(encoded);
  } catch {
    return null;
  }
  if (!json) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRawPayload(raw)) return null;

  let orientation: string;
  try {
    orientation = getTemplate(raw.tp).orientation;
  } catch {
    return null;
  }
  if (orientation !== raw.or) return null;

  const data: CardData = {
    firstName: raw.fn,
    lastName: raw.ln,
    jobTitle: raw.jt,
    company: raw.co,
    mobile: raw.mo,
    email: raw.em,
    address: raw.ad,
    website: raw.ws,
    logoUrl: raw.lg,
    facebook: raw.fb,
    linkedin: raw.li,
    instagram: raw.ig,
    whatsapp: raw.wa,
    messenger: raw.ms,
  };
  const style: StyleOverrides = {};
  if (raw.ac) style.accentColor = raw.ac;
  if (raw.fs !== undefined) style.fontSizeStep = raw.fs;

  return { data, style, templateId: raw.tp };
}

function isRawPayload(value: unknown): value is RawPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.v !== SCHEMA_VERSION) return false;
  const requiredStrings: (keyof RawPayload)[] = ['fn', 'ln', 'jt', 'co', 'mo', 'em', 'tp', 'or'];
  for (const key of requiredStrings) {
    if (typeof v[key] !== 'string' || (v[key] as string).length === 0) return false;
  }
  if (v.or !== 'vertical' && v.or !== 'horizontal') return false;

  // Validate optional string fields
  const optionalStringFields: (keyof RawPayload)[] = ['ad', 'ws', 'lg', 'fb', 'li', 'ig', 'wa', 'ms', 'ac'];
  for (const key of optionalStringFields) {
    if (key in v && typeof v[key] !== 'string') return false;
  }

  // Validate optional number field
  if ('fs' in v && typeof v.fs !== 'number') return false;

  return true;
}

/**
 * Maps a card_drafts row (or anything with the same shape) to an encodable
 * payload — the one place that translates nullable DB columns into the
 * undefined-for-absent shape CardData expects. Shared by the customer
 * status page and the admin order-detail page so both build the exact same
 * QR from the exact same draft data.
 */
export function cardPayloadFromDraft(draft: {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
  facebook: string | null;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  messenger: string | null;
  templateId: string;
  styleOverrides: StyleOverrides;
}): EncodedCardPayload {
  return {
    templateId: draft.templateId,
    style: draft.styleOverrides,
    data: {
      firstName: draft.firstName ?? '',
      lastName: draft.lastName ?? '',
      jobTitle: draft.jobTitle ?? '',
      company: draft.company ?? '',
      mobile: draft.mobile ?? '',
      email: draft.email ?? '',
      address: draft.address ?? undefined,
      website: draft.website ?? undefined,
      logoUrl: draft.logoUrl ?? undefined,
      facebook: draft.facebook ?? undefined,
      linkedin: draft.linkedin ?? undefined,
      instagram: draft.instagram ?? undefined,
      whatsapp: draft.whatsapp ?? undefined,
      messenger: draft.messenger ?? undefined,
    },
  };
}

/**
 * True once a draft's identifying fields have survived long enough to
 * build a real card from — false once the 48h retention cron has scrubbed
 * them back to empty strings. Both QR-rendering call sites use this to
 * distinguish "this order was just approved" from "this order was
 * approved a while ago and its PII has already been cleared," which
 * otherwise look identical (draft row still exists, just empty) and would
 * silently render a QR that decodes as invalid.
 */
export function hasCardContent(draft: { firstName: string | null; lastName: string | null }): boolean {
  return Boolean(draft.firstName && draft.lastName);
}
