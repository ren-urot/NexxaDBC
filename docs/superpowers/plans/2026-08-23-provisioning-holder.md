# Provisioning + PWA Holder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fully client-side transfer of a card onto a customer's phone (QR encodes the card data directly, zero server dependency) and the standalone DBC Holder PWA that displays, saves, and shares it — reopening Commerce's already-merged provisioning-QR generation to switch from a server-looked-up token to self-contained encoding.

**Architecture:** Extends the same Next.js app (same repo, same Postgres DB for Commerce's own bookkeeping) rather than a separate service. The transfer itself — decode, validate, save — happens entirely in the browser with zero network calls beyond the page's own static assets and, if present, one logo image fetch.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM + Postgres, `qrcode.react` (already a dependency), `lz-string` (new), IndexedDB (native browser API, no wrapper library), a hand-rolled service worker (no PWA library).

**Spec:** `docs/superpowers/specs/2026-08-23-provisioning-holder-design.md`

## Global Constraints

- QR payload is a versioned, compressed, base64url-encoded JSON object carried in a URL **fragment** (`#`, never a query string or path segment) — fragments are never sent in an HTTP request, which is what makes the transfer genuinely server-free.
- Compression via `lz-string`'s `compressToEncodedURIComponent`/`decompressFromEncodedURIComponent` is **required**, not optional — a maximally-filled card (Builder's own field-length maximums) exceeds QR capacity at any error-correction level without it. No field is ever truncated to fit.
- Card fields to encode (exact short keys, all sourced from `card_drafts`): `v` (schema version, literal `1`), `fn`/`ln`/`jt`/`co`/`mo`/`em`/`tp`/`or` (required), `ad`/`ws`/`lg`/`fb`/`li`/`ig`/`wa`/`ms`/`ac`/`fs` (optional, omitted entirely from the JSON object when absent rather than encoded as `null`/`undefined`).
- The order's `status: 'approved'` is the final state this whole sub-project ever sets — there is no server-observable "provisioned" event, no ping-back, no record of whether a transfer happened. `orderStatusEnum`'s `'provisioned'` value is left defined-but-unused in the DB (removing a Postgres enum value is unnecessarily risky for a status nothing references).
- `orders.provisioningToken`, `provisioningTokenStatus`, `provisioningExpiresAt` are dropped via a migration once nothing reads or writes them — no vestigial schema.
- The Holder's "Regenerate QR"/"Expire QR" admin actions are removed entirely, along with their API routes — there's no server-side token left to regenerate or expire, and a card's content is frozen after Builder submission regardless (no scenario needs a refreshed QR).
- Before the retention cron nulls a draft's PII, it archives the full customer/order record (names, company, contact info, amount, dates) into a new admin-only `customer_history` table — the product owner needs durable records for investor pitch-deck traction (real customer names as social proof, not just aggregate counts), while keeping that PII out of the live, internet-facing database past its useful window. This table is never exposed to any customer-facing route, only via a password-gated admin CSV export. This doesn't touch the "zero DB dependency" constraint above, which is specifically about the *transfer*, not Commerce's own backend bookkeeping.
- The Holder app reuses Builder's existing template components (`components/templates/*`) and `PhoneFrame` unmodified — same visual rendering, no forked copy.
- IndexedDB access is tested via `fake-indexeddb` (new devDependency) — jsdom (already used for this project's component tests) doesn't implement IndexedDB itself.
- Every task that touches `lib/db/schema.ts`-derived types keeps the codebase compiling and the full test suite green at its own boundary — several of the "remove the provisioning-token columns" changes cascade through multiple files that reference the same fields, so those land together in one task rather than being split across a compile-breaking gap.
- Design tokens (reused, not reinvented): `font-display`/`font-sans`/`font-mono`; colors `paper`/`ink`/`ink-soft`/`scan`/`line`/`stock`; `rounded-full` pill buttons; `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan` on every interactive element (never bare `outline-none`).

---

## Task 1: Card Encoding

**Files:**
- Create: `lib/card-encoding.ts`
- Test: `lib/card-encoding.test.ts`

**Interfaces:**
- Consumes: `getTemplate` (`lib/templates/registry.ts`), `CardData`/`StyleOverrides` (`lib/templates/types.ts`)
- Produces: `encodeCard(payload: EncodedCardPayload): string`, `decodeCard(encoded: string): EncodedCardPayload | null`, `cardPayloadFromDraft(draft): EncodedCardPayload`, and the `EncodedCardPayload` type (`{ data: CardData; style: StyleOverrides; templateId: string }`) — consumed by Tasks 6, 8, and 14.

- [ ] **Step 1: Install `lz-string`**

```bash
npm install lz-string
npm install -D @types/lz-string
```

- [ ] **Step 2: Write the failing tests**

Create `lib/card-encoding.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- card-encoding`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

Create `lib/card-encoding.ts`:

```ts
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { getTemplate } from '@/lib/templates/registry';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

const SCHEMA_VERSION = 1;

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- card-encoding`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/card-encoding.ts lib/card-encoding.test.ts
git commit -m "feat: add card encode/decode for the standalone provisioning QR"
```

---

## Task 2: Holder Local Storage

**Files:**
- Create: `lib/holder-storage.ts`
- Test: `lib/holder-storage.test.ts`

**Interfaces:**
- Consumes: `CardData`/`StyleOverrides` (`lib/templates/types.ts`)
- Produces: `HolderCard` type, `saveCard(card): Promise<void>`, `getCard(): Promise<HolderCard | null>`, `hasCard(): Promise<boolean>` — consumed by Tasks 13 and 14.

- [ ] **Step 1: Install `fake-indexeddb`**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 2: Write the failing tests**

Create `lib/holder-storage.test.ts`:

```ts
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveCard, getCard, hasCard } from './holder-storage';
import type { CardData } from '@/lib/templates/types';

const sampleData: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

beforeEach(() => {
  // A fresh in-memory IndexedDB per test — real IndexedDB persists across a
  // browser session, so each test needs its own isolated instance rather
  // than inheriting state from the previous one.
  globalThis.indexedDB = new IDBFactory();
});

describe('holder-storage', () => {
  it('reports no card when nothing has been saved', async () => {
    expect(await hasCard()).toBe(false);
    expect(await getCard()).toBeNull();
  });

  it('saves and retrieves a card', async () => {
    await saveCard({ data: sampleData, style: {}, templateId: 'corporate-vertical' });
    expect(await hasCard()).toBe(true);
    const card = await getCard();
    expect(card?.data).toEqual(sampleData);
    expect(card?.templateId).toBe('corporate-vertical');
    expect(card?.savedAt).toBeDefined();
  });

  it('overwrites a previously saved card', async () => {
    await saveCard({ data: sampleData, style: {}, templateId: 'corporate-vertical' });
    const updated: CardData = { ...sampleData, jobTitle: 'CEO' };
    await saveCard({ data: updated, style: {}, templateId: 'modern-horizontal' });
    const card = await getCard();
    expect(card?.data.jobTitle).toBe('CEO');
    expect(card?.templateId).toBe('modern-horizontal');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- holder-storage`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Write the implementation**

Create `lib/holder-storage.ts`:

```ts
import type { CardData, StyleOverrides } from '@/lib/templates/types';

const DB_NAME = 'dbc-holder';
const DB_VERSION = 1;
const STORE_NAME = 'card';
const RECORD_KEY = 'current';

export interface HolderCard {
  data: CardData;
  style: StyleOverrides;
  templateId: string;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCard(card: Omit<HolderCard, 'savedAt'>): Promise<void> {
  const db = await openDb();
  const record: HolderCard = { ...card, savedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getCard(): Promise<HolderCard | null> {
  const db = await openDb();
  const record = await new Promise<HolderCard | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record ?? null;
}

export async function hasCard(): Promise<boolean> {
  return (await getCard()) !== null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- holder-storage`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/holder-storage.ts lib/holder-storage.test.ts
git commit -m "feat: add IndexedDB-backed local card storage for the Holder"
```

---

## Task 3: vCard Generator

**Files:**
- Create: `lib/vcard.ts`
- Test: `lib/vcard.test.ts`

**Interfaces:**
- Consumes: `CardData` (`lib/templates/types.ts`)
- Produces: `buildVCard(data: CardData): string` — consumed by Task 13.

- [ ] **Step 1: Write the failing tests**

Create `lib/vcard.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- vcard`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

Create `lib/vcard.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- vcard`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/vcard.ts lib/vcard.test.ts
git commit -m "feat: add vCard generator for Holder's Save to Contacts action"
```

---

## Task 4: Retire the Provisioning-Token Columns and Simplify Order Approval

This is one task, not several, because the schema change and every file that reads the columns it removes must land together — splitting them would leave the codebase non-compiling between task boundaries.

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/orders.ts`
- Modify: `lib/db/orders.test.ts`
- Modify: `app/api/admin/orders/[id]/approve/route.ts`
- Modify: `app/api/admin/orders/[id]/approve/route.test.ts`
- Delete: `app/api/admin/orders/[id]/provisioning-qr/regenerate/route.ts` and its test
- Delete: `app/api/admin/orders/[id]/provisioning-qr/expire/route.ts` and its test
- Create: `drizzle/0003_*.sql` (generated, not hand-written)

**Interfaces:**
- Consumes: nothing new
- Produces: `approveOrder(id: string): Promise<OrderRow | null>` (was `approveOrder(id, token, expiresAt)`) — the approve route this same task updates is its only caller; no later task calls it directly.

- [ ] **Step 1: Remove the columns from the schema**

In `lib/db/schema.ts`, delete the `provisioningTokenStatusEnum` export entirely (no longer used anywhere):

```ts
export const provisioningTokenStatusEnum = pgEnum('provisioning_token_status', [
  'active',
  'expired',
  'consumed',
]);
```

And in the `orders` table definition, delete these three lines:

```ts
  provisioningToken: varchar('provisioning_token', { length: 64 }).unique(),
  provisioningTokenStatus: provisioningTokenStatusEnum('provisioning_token_status'),
  provisioningExpiresAt: timestamp('provisioning_expires_at'),
```

- [ ] **Step 2: Generate and apply the migration**

`drizzle.config.ts` doesn't read `.env.local`/`.env.test` automatically (it only loads a bare `.env`, which doesn't exist in this project) — `DATABASE_URL` must be passed explicitly on each command:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5434/dbc_dev" npm run db:generate
DATABASE_URL="postgres://postgres:postgres@localhost:5434/dbc_dev" npm run db:push
DATABASE_URL="postgres://postgres:postgres@localhost:5433/dbc_test" npm run db:push
```

Dropping a column is a destructive change — `db:push` will prompt for confirmation. Unlike a unique constraint over rows with real business value, this is fine to force through: these columns are being deliberately retired in this same task, and once nothing in the codebase generates or checks a provisioning token, the temporary tokens sitting in them have no retention value. If a non-interactive `--force`-style flag is available (check `npx drizzle-kit push --help`), use it; otherwise confirm the prompt directly.

If either Postgres container isn't reachable, run `docker ps` first — `dbc-dev-pg` (5434) and `dbc-test-pg` (5433) are expected to already be running from earlier work in this project.

- [ ] **Step 3: Simplify `approveOrder` and remove the regenerate/expire DB functions**

In `lib/db/orders.ts`, replace:

```ts
export async function approveOrder(id: string, token: string, expiresAt: Date): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({
      status: 'approved',
      provisioningToken: token,
      provisioningTokenStatus: 'active',
      provisioningExpiresAt: expiresAt,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}
```

with:

```ts
export async function approveOrder(id: string): Promise<OrderRow | null> {
  const [row] = await db
    .update(orders)
    .set({ status: 'approved', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(orders.id, id))
    .returning();
  return row ?? null;
}
```

Delete these two functions entirely (nothing calls them once the routes below are deleted):

```ts
export async function regenerateProvisioningToken(...) { ... }
export async function expireProvisioningToken(...) { ... }
```

- [ ] **Step 4: Update `lib/db/orders.test.ts`**

Replace the `approveOrder` describe block:

```ts
describe('approveOrder', () => {
  it('sets status approved and stores the provisioning token', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const updated = await approveOrder(created.id, 'tok123', expiresAt);
    expect(updated?.status).toBe('approved');
    expect(updated?.provisioningToken).toBe('tok123');
    expect(updated?.provisioningTokenStatus).toBe('active');
  });
});
```

with:

```ts
describe('approveOrder', () => {
  it('sets status to approved', async () => {
    const draft = await makeDraft();
    const created = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    const updated = await approveOrder(created.id);
    expect(updated?.status).toBe('approved');
  });
});
```

Delete the `describe('regenerateProvisioningToken', ...)` and `describe('expireProvisioningToken', ...)` blocks entirely, and remove `regenerateProvisioningToken`, `expireProvisioningToken` from the import list at the top of the file (keep `approveOrder` and the others).

- [ ] **Step 5: Simplify the approve route**

Replace `app/api/admin/orders/[id]/approve/route.ts` in full:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, approveOrder } from '@/lib/db/orders';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.status !== 'submitted') {
      return NextResponse.json(
        { error: `Order must be submitted to approve, currently ${order.status}` },
        { status: 409 }
      );
    }

    const updated = await approveOrder(id);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Update the approve route's test**

Replace the first test in `app/api/admin/orders/[id]/approve/route.test.ts`:

```ts
  it('approves a submitted order and generates a provisioning token', async () => {
    const order = await submittedOrder();
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: order!.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('approved');
    expect(body.provisioningToken).toMatch(/^[0-9a-f]{64}$/);
    expect(body.provisioningTokenStatus).toBe('active');
    expect(new Date(body.provisioningExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });
```

with:

```ts
  it('approves a submitted order', async () => {
    const order = await submittedOrder();
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: order!.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('approved');
  });
```

The other two tests (409 on non-submitted, 404 on unknown) are unaffected.

- [ ] **Step 7: Delete the regenerate and expire routes and their tests**

```bash
rm -rf "app/api/admin/orders/[id]/provisioning-qr"
```

(This removes both `regenerate/route.ts` + `regenerate/route.test.ts` and `expire/route.ts` + `expire/route.test.ts` in one go, along with the now-empty `provisioning-qr` directory.)

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: PASS — all files, no reference to the deleted functions/columns remains anywhere else yet (that's Tasks 8 and 10).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add lib/db/schema.ts lib/db/orders.ts lib/db/orders.test.ts \
  "app/api/admin/orders/[id]/approve/route.ts" "app/api/admin/orders/[id]/approve/route.test.ts" \
  drizzle/
git add -u "app/api/admin/orders/[id]/provisioning-qr"
git commit -m "feat: drop provisioning-token columns, simplify order approval"
```

---

## Task 5: Customer Order Route Includes Draft Fields

**Files:**
- Modify: `app/api/orders/[id]/route.ts`
- Modify: `app/api/orders/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getDraftById` (`lib/db/drafts.ts`)
- Produces: `GET /api/orders/[id]` now returns `{...order, draft}` (previously order-only) — consumed by Task 7 (status page).

- [ ] **Step 1: Write the failing test**

Add to `app/api/orders/[id]/route.test.ts`, inside the existing `describe` block, right after the first test:

```ts
  it('includes the linked draft so the client can render the provisioning QR', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });

    const req = new NextRequest('http://localhost', { headers: { cookie: 'dbc_session=s1' } });
    const res = await GET(req, { params: Promise.resolve({ id: order.id }) });
    const body = await res.json();

    expect(body.draft.id).toBe(draft.id);
    expect(body.draft.templateId).toBe('corporate-vertical');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- "app/api/orders/\[id\]/route.test.ts"`
Expected: FAIL — `body.draft` is undefined.

- [ ] **Step 3: Update the route**

Replace `app/api/orders/[id]/route.ts` in full:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { loadOwnedOrder } from '@/lib/order-access';
import { getDraftById } from '@/lib/db/drafts';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await loadOwnedOrder(req, id);
    if (!access.ok) return access.response;
    const draft = await getDraftById(access.order.draftId);
    return NextResponse.json({ ...access.order, draft });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

No import changes needed in the test file — it already imports `createDraft` from `@/lib/db/drafts`, which is all the new test uses.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- "app/api/orders/\[id\]/route.test.ts"`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/api/orders/[id]/route.ts" "app/api/orders/[id]/route.test.ts"
git commit -m "feat: include draft fields in customer order response"
```

---

## Task 6: Shared Card-Install QR and OrderStatus Rewrite

**Files:**
- Create: `components/shared/CardInstallQR.tsx`
- Modify: `components/checkout/OrderStatus.tsx`

**Interfaces:**
- Consumes: `encodeCard`, `cardPayloadFromDraft` (Task 1), `qrcode.react`
- Produces: `CardInstallQR({ value }: { value: string })` — consumed by Task 8. `OrderStatus`'s new prop shape (`draft` instead of `provisioningToken`/`provisioningTokenStatus`/`provisioningExpiresAt`) — consumed by Task 7.

Do not delete `lib/provisioning-token.ts` yet — the admin order-detail page (Task 8) still imports it until that task lands.

- [ ] **Step 1: Create the shared QR component**

Create `components/shared/CardInstallQR.tsx`:

```tsx
'use client';

import { QRCodeSVG } from 'qrcode.react';

export function CardInstallQR({ value }: { value: string }) {
  return (
    <div
      data-qr-value={value}
      className="flex flex-col items-center gap-3 rounded-sm border border-line bg-stock p-6"
    >
      <QRCodeSVG value={value} size={200} />
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">Scan to add to your phone</p>
    </div>
  );
}
```

(`data-qr-value` carries the exact encoded URL for Task 15's E2E test — Playwright can't decode a rendered QR image, so it reads this attribute instead.)

- [ ] **Step 2: Rewrite OrderStatus.tsx**

Replace `components/checkout/OrderStatus.tsx` in full:

```tsx
'use client';

import { encodeCard, cardPayloadFromDraft } from '@/lib/card-encoding';
import { CardInstallQR } from '@/components/shared/CardInstallQR';
import type { StyleOverrides } from '@/lib/templates/types';

const STATUS_COPY: Record<string, { label: string; body: string }> = {
  pending_payment: {
    label: 'Waiting for payment',
    body: 'Head back to checkout to pay and submit your reference.',
  },
  submitted: {
    label: 'Under review',
    body: "We're verifying your payment. This usually takes a little while.",
  },
  approved: {
    label: 'Approved',
    body: 'Your card is ready. Scan the code below to add it to your phone.',
  },
  rejected: {
    label: 'Payment rejected',
    body: 'Something was off with your payment. See the note below and resubmit.',
  },
};

interface StatusDraft {
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
}

interface OrderStatusProps {
  status: string;
  adminNotes?: string | null;
  draft?: StatusDraft | null;
  origin: string;
}

export function OrderStatus({ status, adminNotes, draft, origin }: OrderStatusProps) {
  const copy = STATUS_COPY[status] ?? { label: status, body: '' };
  const qrValue =
    status === 'approved' && draft ? `${origin}/holder/install#${encodeCard(cardPayloadFromDraft(draft))}` : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">{copy.label}</p>
        <p className="mt-2 text-ink-soft">{copy.body}</p>
      </div>
      {status === 'rejected' && adminNotes && (
        <p role="alert" className="rounded-sm border border-ink/20 bg-stock px-4 py-3 text-sm text-ink">
          {adminNotes}
        </p>
      )}
      {qrValue && <CardInstallQR value={qrValue} />}
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — `OrderStatus` has no dedicated test file (established precedent from Commerce: presentational component covered by E2E), so nothing directly exercises the new prop shape yet; the status page (Task 7) still passes the *old* props until it's updated next, so this alone leaves the page passing props `OrderStatus` no longer declares — harmless (React ignores unknown props) and doesn't fail any test.

Run: `npx tsc --noEmit`
Expected: clean (the status page's prop object is looser than `OrderStatusProps` typing only if TS flags excess-property errors on inline object literals — verify; if it does, that's expected and resolves in Task 7, not a regression here).

- [ ] **Step 4: Commit**

```bash
git add components/shared/CardInstallQR.tsx components/checkout/OrderStatus.tsx
git commit -m "feat: compute the provisioning QR from card data instead of a token"
```

---

## Task 7: Status Page Passes Draft Instead of Token Fields

**Files:**
- Modify: `app/checkout/[orderId]/status/page.tsx`

**Interfaces:**
- Consumes: `OrderStatus`'s new prop shape (Task 6), `GET /api/orders/[id]`'s `draft` field (Task 5)
- Produces: nothing new — this is the last consumer that needed updating for the customer-facing side of the transfer.

- [ ] **Step 1: Update the page**

In `app/checkout/[orderId]/status/page.tsx`, replace the `OrderState` interface:

```ts
interface OrderState {
  id: string;
  status: string;
  amount: number;
  adminNotes: string | null;
  provisioningToken: string | null;
  provisioningTokenStatus: string | null;
  provisioningExpiresAt: string | null;
}
```

with:

```ts
interface OrderState {
  id: string;
  status: string;
  amount: number;
  adminNotes: string | null;
  draft: {
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
    styleOverrides: { accentColor?: string; fontSizeStep?: number };
  } | null;
}
```

And replace the `<OrderStatus>` call:

```tsx
        <OrderStatus
          status={order.status}
          adminNotes={order.adminNotes}
          provisioningToken={order.provisioningToken}
          provisioningTokenStatus={order.provisioningTokenStatus}
          provisioningExpiresAt={order.provisioningExpiresAt}
          origin={origin}
        />
```

with:

```tsx
        <OrderStatus status={order.status} adminNotes={order.adminNotes} draft={order.draft} origin={origin} />
```

Nothing else on the page changes — the rejected-order resubmit flow (`PaymentMethodSelector`/`PaymentQR`/`PaymentForm`) is untouched.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — no dedicated test file for this page (established precedent), covered by E2E (Task 15).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/checkout/[orderId]/status/page.tsx"
git commit -m "feat: wire the status page's provisioning QR to card data"
```

---

## Task 8: Admin Order-Detail Page Rewrite

**Files:**
- Modify: `app/admin/orders/[id]/page.tsx`
- Delete: `components/admin/ProvisioningQR.tsx`
- Delete: `lib/provisioning-token.ts` and `lib/provisioning-token.test.ts`

**Interfaces:**
- Consumes: `encodeCard`, `cardPayloadFromDraft` (Task 1), `CardInstallQR` (Task 6)
- Produces: nothing new — this is the last consumer of the old token-based provisioning system; once this lands, no file in the repo references `provisioningToken`/`provisioningTokenStatus`/`provisioningExpiresAt`/`lib/provisioning-token.ts` anywhere.

- [ ] **Step 1: Rewrite the page**

Replace `app/admin/orders/[id]/page.tsx` in full:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { encodeCard, cardPayloadFromDraft } from '@/lib/card-encoding';
import { CardInstallQR } from '@/components/shared/CardInstallQR';
import type { StyleOverrides } from '@/lib/templates/types';

interface OrderDraft {
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
}

interface OrderDetail {
  id: string;
  status: string;
  amount: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  adminNotes: string | null;
  draft: OrderDraft | null;
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));

  async function load() {
    const res = await fetch(`/api/admin/orders/${id}`);
    if (res.ok) setOrder(await res.json());
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [id]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}${path}`, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        setError('That action failed. Please try again.');
        setBusy(false);
        return;
      }
      await load();
      setBusy(false);
    } catch {
      setError('That action failed. Check your connection and try again.');
      setBusy(false);
    }
  }

  if (!order) return <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Loading…</p>;

  const qrValue =
    order.status === 'approved' && order.draft
      ? `${origin}/holder/install#${encodeCard(cardPayloadFromDraft(order.draft))}`
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Order · {order.status}</p>
      <h1 className="font-display text-3xl font-medium text-ink">
        {order.draft ? `${order.draft.firstName} ${order.draft.lastName}` : 'Order'}
      </h1>
      <div className="mt-8 space-y-2 text-ink-soft">
        <p>{order.draft?.company}</p>
        <p>{order.draft?.email}</p>
        <p>Method: {order.paymentMethod ?? '—'}</p>
        <p>Reference: {order.paymentReference ?? '—'}</p>
      </div>

      {order.paymentProofUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={order.paymentProofUrl} alt="Payment proof" className="mt-6 max-w-xs rounded-sm border border-line" />
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[#b3452c]">
          {error}
        </p>
      )}

      {order.status === 'submitted' && (
        <div className="mt-8 space-y-4">
          <button
            onClick={() => act('/approve')}
            disabled={busy}
            className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
          >
            Approve
          </button>
          <div className="space-y-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                Rejection note
              </span>
              <input
                aria-label="Rejection note"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1.5 w-full border-b border-line bg-transparent py-1.5 text-[15px] text-ink focus:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
              />
            </label>
            <button
              onClick={() => act('/reject', { notes })}
              disabled={busy || !notes.trim()}
              className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {qrValue && (
        <div className="mt-8">
          <CardInstallQR value={qrValue} />
        </div>
      )}
    </main>
  );
}
```

This drops the "Regenerate QR" and "Expire QR" buttons entirely — there's no server-side token left for either action to act on.

- [ ] **Step 2: Delete the now-unused files**

```bash
rm components/admin/ProvisioningQR.tsx lib/provisioning-token.ts lib/provisioning-token.test.ts
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — no dedicated test file for this page (established precedent), covered by E2E (Task 15). Confirm no remaining reference anywhere: `grep -rn "provisioningToken\|provisioning-token\|ProvisioningQR" --include="*.ts" --include="*.tsx" . | grep -v node_modules` should return nothing.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/orders/[id]/page.tsx"
git add -u components/admin/ProvisioningQR.tsx lib/provisioning-token.ts lib/provisioning-token.test.ts
git commit -m "feat: replace admin's token-based QR with card-data QR, remove regenerate/expire"
```

---

## Task 9: Customer History Archive and Retention Cron

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `lib/db/customer-history.ts`
- Test: `lib/db/customer-history.test.ts`
- Modify: `lib/blob.ts`
- Create: `app/api/cron/cleanup-approved-orders/route.ts`
- Test: `app/api/cron/cleanup-approved-orders/route.test.ts`

**Interfaces:**
- Consumes: `updateDraft`, `getDraftById` (`lib/db/drafts.ts`), `deleteLogo` (`lib/blob.ts`)
- Produces: the `customerHistory` table, `archiveOrder(input): Promise<CustomerHistoryRow>`, `listCustomerHistory(): Promise<CustomerHistoryRow[]>` — consumed by Task 10 (admin CSV export). `deletePaymentProof(url: string): Promise<void>` (new export from `lib/blob.ts`), `GET /api/cron/cleanup-approved-orders`.

The product owner needs a durable record of real customer/order history for investor pitch-deck traction — actual names and companies as social proof, not just counts — while keeping that PII out of the live, internet-facing database past its useful window. Before this cron nulls a draft's PII, it archives the full record into a new admin-only table nothing customer-facing ever reads from.

- [ ] **Step 1: Add the `customer_history` table**

In `lib/db/schema.ts`, add (after the `orders` table definition):

```ts
export const customerHistory = pgTable('customer_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  jobTitle: varchar('job_title', { length: 150 }),
  company: varchar('company', { length: 150 }),
  mobile: varchar('mobile', { length: 30 }),
  email: varchar('email', { length: 255 }),
  templateId: varchar('template_id', { length: 64 }).notNull(),
  amount: integer('amount').notNull(),
  orderCreatedAt: timestamp('order_created_at').notNull(),
  archivedAt: timestamp('archived_at').notNull().defaultNow(),
});

export type CustomerHistoryRow = typeof customerHistory.$inferSelect;
export type CustomerHistoryInsert = typeof customerHistory.$inferInsert;
```

`orderId` is deliberately not a hard foreign key — this table is a durable archive meant to outlive the operational lifecycle of the order/draft rows it was copied from, so it shouldn't be coupled to their existence or deletion order.

Generate and apply the migration (same explicit-`DATABASE_URL` pattern as Task 4, since `drizzle.config.ts` doesn't read `.env.local`/`.env.test` automatically):

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5434/dbc_dev" npm run db:generate
DATABASE_URL="postgres://postgres:postgres@localhost:5434/dbc_dev" npm run db:push
DATABASE_URL="postgres://postgres:postgres@localhost:5433/dbc_test" npm run db:push
```

- [ ] **Step 2: Write the failing test for the DB helper**

Create `lib/db/customer-history.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './client';
import { customerHistory, orders, cardDrafts } from './schema';
import { archiveOrder, listCustomerHistory } from './customer-history';

beforeEach(async () => {
  await db.delete(customerHistory);
  await db.delete(orders);
  await db.delete(cardDrafts);
});

describe('archiveOrder / listCustomerHistory', () => {
  it('archives a full record and lists it back newest first', async () => {
    await archiveOrder({
      orderId: '11111111-1111-1111-1111-111111111111',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales Director',
      company: 'ABC Corporation',
      mobile: '+639171234567',
      email: 'juan@abc.com',
      templateId: 'corporate-vertical',
      amount: 499,
      orderCreatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    await archiveOrder({
      orderId: '22222222-2222-2222-2222-222222222222',
      firstName: 'Ana',
      lastName: 'Reyes',
      jobTitle: 'Owner',
      company: 'Reyes Bakery',
      mobile: '+639170000000',
      email: 'ana@reyes.example',
      templateId: 'minimal-horizontal',
      amount: 499,
      orderCreatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    const history = await listCustomerHistory();
    expect(history).toHaveLength(2);
    // Newest archivedAt first — both were archived moments apart in this
    // test, so this asserts ordering by checking the more recently-inserted
    // row (Ana's) comes first, not by asserting on orderCreatedAt order.
    expect(history[0].company).toBe('Reyes Bakery');
    expect(history[1].company).toBe('ABC Corporation');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test -- customer-history`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Write the DB helper**

Create `lib/db/customer-history.ts`:

```ts
import { desc } from 'drizzle-orm';
import { db } from './client';
import { customerHistory, type CustomerHistoryRow } from './schema';

export async function archiveOrder(input: {
  orderId: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  mobile: string | null;
  email: string | null;
  templateId: string;
  amount: number;
  orderCreatedAt: Date;
}): Promise<CustomerHistoryRow> {
  const [row] = await db.insert(customerHistory).values(input).returning();
  return row;
}

export async function listCustomerHistory(): Promise<CustomerHistoryRow[]> {
  return db.select().from(customerHistory).orderBy(desc(customerHistory.archivedAt));
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -- customer-history`
Expected: PASS (1 test)

- [ ] **Step 6: Add `deletePaymentProof` to `lib/blob.ts`**

Add this export, mirroring `deleteLogo`'s exact shape:

```ts
export async function deletePaymentProof(url: string): Promise<void> {
  if (!hasBlobToken()) return delLocal(url);
  await del(url);
}
```

- [ ] **Step 7: Write the failing cron tests**

Create `app/api/cron/cleanup-approved-orders/route.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders, cardDrafts, customerHistory } from '@/lib/db/schema';
import { createDraft, updateDraft, getDraftById } from '@/lib/db/drafts';
import { createOrder, approveOrder } from '@/lib/db/orders';
import { listCustomerHistory } from '@/lib/db/customer-history';

vi.mock('@/lib/blob', () => ({
  deleteLogo: vi.fn().mockResolvedValue(undefined),
  deletePaymentProof: vi.fn().mockResolvedValue(undefined),
  uploadLogo: vi.fn(),
  uploadPaymentProof: vi.fn(),
}));

import { deleteLogo, deletePaymentProof } from '@/lib/blob';
import { GET } from './route';

function cronRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/cleanup-approved-orders', { headers });
}

async function makeStaleApprovedOrder(opts: { logoUrl?: string } = {}) {
  const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
  await updateDraft(draft.id, {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    jobTitle: 'Sales',
    company: 'ABC',
    mobile: '+639171234567',
    email: 'juan@abc.com',
    logoUrl: opts.logoUrl,
  });
  const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
  await approveOrder(order.id);
  await db
    .update(orders)
    .set({
      paymentProofUrl: 'https://blob.example.com/proof.png',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    })
    .where(eq(orders.id, order.id));
  return { draft, order };
}

beforeEach(async () => {
  await db.delete(customerHistory);
  await db.delete(orders);
  await db.delete(cardDrafts);
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/cleanup-approved-orders', () => {
  it('archives the full record, deletes the payment proof, and nulls PII on drafts approved over 48h ago', async () => {
    const { draft, order } = await makeStaleApprovedOrder();

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.cleanedCount).toBe(1);
    expect(deletePaymentProof).toHaveBeenCalledWith('https://blob.example.com/proof.png');

    const history = await listCustomerHistory();
    expect(history).toHaveLength(1);
    expect(history[0].orderId).toBe(order.id);
    expect(history[0].firstName).toBe('Juan');
    expect(history[0].company).toBe('ABC');
    expect(history[0].amount).toBe(499);

    const updatedDraft = await getDraftById(draft.id);
    expect(updatedDraft?.firstName).toBeNull();
    expect(updatedDraft?.email).toBeNull();
    expect(updatedDraft?.templateId).toBe('corporate-vertical');

    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(updatedOrder.paymentProofUrl).toBeNull();
    expect(updatedOrder.status).toBe('approved');
  });

  it('deletes the logo blob when the draft has one', async () => {
    await makeStaleApprovedOrder({ logoUrl: 'https://blob.example.com/logo.png' });
    await GET(cronRequest());
    expect(deleteLogo).toHaveBeenCalledWith('https://blob.example.com/logo.png');
  });

  it('leaves a recently-approved order untouched', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const order = await createOrder({ draftId: draft.id, sessionId: 's1', amount: 499 });
    await approveOrder(order.id);
    await db
      .update(orders)
      .set({ paymentProofUrl: 'https://blob.example.com/proof.png' })
      .where(eq(orders.id, order.id));

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.cleanedCount).toBe(0);
    expect(deletePaymentProof).not.toHaveBeenCalled();
    expect(await listCustomerHistory()).toHaveLength(0);
  });

  it('does not reprocess an order already cleaned up', async () => {
    await makeStaleApprovedOrder();
    await GET(cronRequest());
    vi.clearAllMocks();

    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.cleanedCount).toBe(0);
    expect(deletePaymentProof).not.toHaveBeenCalled();
    // Already-archived, not re-archived on a repeat run.
    expect(await listCustomerHistory()).toHaveLength(1);
  });

  it('rejects a request without the cron secret when one is configured', async () => {
    process.env.CRON_SECRET = 'top-secret';
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it('accepts a request carrying the configured cron secret', async () => {
    process.env.CRON_SECRET = 'top-secret';
    const res = await GET(cronRequest({ authorization: 'Bearer top-secret' }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `npm run test -- cleanup-approved-orders`
Expected: FAIL — route does not exist.

- [ ] **Step 9: Write the implementation**

Create `app/api/cron/cleanup-approved-orders/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';
import { getDraftById, updateDraft } from '@/lib/db/drafts';
import { archiveOrder } from '@/lib/db/customer-history';
import { deleteLogo, deletePaymentProof } from '@/lib/blob';

const FORTY_EIGHT_HOURS_MS = 1000 * 60 * 60 * 48;

/**
 * Same authorization approach as expire-drafts: fails closed in production
 * when CRON_SECRET is unset, skipped outside production for local dev/tests.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);
    const staleRows = await db
      .select({
        id: orders.id,
        draftId: orders.draftId,
        paymentProofUrl: orders.paymentProofUrl,
        amount: orders.amount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.status, 'approved'), lt(orders.updatedAt, cutoff), isNotNull(orders.paymentProofUrl)));

    let cleanedCount = 0;
    for (const row of staleRows) {
      try {
        const draft = await getDraftById(row.draftId);

        // Archive the full record before anything is deleted — this is the
        // durable history an admin can later export (Task 10), kept out of
        // the live draft/order rows once this run finishes.
        await archiveOrder({
          orderId: row.id,
          firstName: draft?.firstName ?? null,
          lastName: draft?.lastName ?? null,
          jobTitle: draft?.jobTitle ?? null,
          company: draft?.company ?? null,
          mobile: draft?.mobile ?? null,
          email: draft?.email ?? null,
          templateId: draft?.templateId ?? '',
          amount: row.amount,
          orderCreatedAt: row.createdAt,
        });

        if (row.paymentProofUrl) {
          await deletePaymentProof(row.paymentProofUrl);
        }
        if (draft?.logoUrl) {
          await deleteLogo(draft.logoUrl);
        }

        // Nulls every PII field in place — the draft row survives as a
        // minimal skeleton (id, template, timestamps), same as the order
        // does, now that the full record lives in customer_history instead.
        await updateDraft(row.draftId, {
          firstName: '',
          lastName: '',
          jobTitle: '',
          company: '',
          mobile: '',
          email: '',
          address: '',
          website: '',
          logoUrl: '',
          facebook: '',
          linkedin: '',
          instagram: '',
          whatsapp: '',
          messenger: '',
        });

        await db.update(orders).set({ paymentProofUrl: null }).where(eq(orders.id, row.id));
        cleanedCount++;
      } catch (err) {
        console.error(`Failed to clean up order ${row.id}`, err);
      }
    }

    return NextResponse.json({ cleanedCount });
  } catch (err) {
    console.error('cleanup-approved-orders cron failed', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm run test -- cleanup-approved-orders`
Expected: PASS (6 tests)

- [ ] **Step 11: Commit**

```bash
git add lib/db/schema.ts lib/db/customer-history.ts lib/db/customer-history.test.ts drizzle/ \
  lib/blob.ts app/api/cron/cleanup-approved-orders
git commit -m "feat: archive customer history before retention cleanup"
```

---

## Task 10: Admin Customer History Export

**Files:**
- Create: `app/api/admin/customer-history/export/route.ts`
- Test: `app/api/admin/customer-history/export/route.test.ts`
- Modify: `app/admin/orders/page.tsx`

**Interfaces:**
- Consumes: `listCustomerHistory` (Task 9)
- Produces: `GET /api/admin/customer-history/export` — a downloadable CSV.

This route needs no admin-auth check of its own — it lives at `app/api/admin/customer-history/export`, which already matches `proxy.ts`'s existing `/api/admin/:path*` matcher, exactly like every other admin route in this codebase.

- [ ] **Step 1: Write the failing tests**

Create `app/api/admin/customer-history/export/route.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/client';
import { customerHistory } from '@/lib/db/schema';
import { archiveOrder } from '@/lib/db/customer-history';
import { GET } from './route';

beforeEach(async () => {
  await db.delete(customerHistory);
});

describe('GET /api/admin/customer-history/export', () => {
  it('returns a CSV with a header row and one row per archived customer', async () => {
    await archiveOrder({
      orderId: '11111111-1111-1111-1111-111111111111',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales Director',
      company: 'ABC Corporation',
      mobile: '+639171234567',
      email: 'juan@abc.com',
      templateId: 'corporate-vertical',
      amount: 499,
      orderCreatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    const lines = text.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'Order ID,First Name,Last Name,Job Title,Company,Mobile,Email,Template,Amount,Order Date,Archived At'
    );
    expect(lines[1]).toContain('Juan');
    expect(lines[1]).toContain('ABC Corporation');
  });

  it('returns just the header row when there is no history yet', async () => {
    const res = await GET();
    const text = await res.text();
    expect(text.trim().split('\r\n')).toHaveLength(1);
  });

  it('quotes a field containing a comma', async () => {
    await archiveOrder({
      orderId: '22222222-2222-2222-2222-222222222222',
      firstName: 'Ana',
      lastName: 'Reyes',
      jobTitle: 'Owner',
      company: 'Reyes, Inc.',
      mobile: '+639170000000',
      email: 'ana@reyes.example',
      templateId: 'minimal-horizontal',
      amount: 499,
      orderCreatedAt: new Date(),
    });

    const res = await GET();
    const text = await res.text();
    expect(text).toContain('"Reyes, Inc."');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- "customer-history/export"`
Expected: FAIL — route does not exist.

- [ ] **Step 3: Write the implementation**

Create `app/api/admin/customer-history/export/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { listCustomerHistory } from '@/lib/db/customer-history';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADER = [
  'Order ID',
  'First Name',
  'Last Name',
  'Job Title',
  'Company',
  'Mobile',
  'Email',
  'Template',
  'Amount',
  'Order Date',
  'Archived At',
];

export async function GET() {
  try {
    const history = await listCustomerHistory();
    const rows = history.map(row => [
      row.orderId,
      row.firstName ?? '',
      row.lastName ?? '',
      row.jobTitle ?? '',
      row.company ?? '',
      row.mobile ?? '',
      row.email ?? '',
      row.templateId,
      String(row.amount),
      row.orderCreatedAt.toISOString(),
      row.archivedAt.toISOString(),
    ]);
    const csv = [HEADER, ...rows].map(fields => fields.map(csvEscape).join(',')).join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="customer-history-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- "customer-history/export"`
Expected: PASS (3 tests)

- [ ] **Step 5: Add the download link to the admin dashboard**

In `app/admin/orders/page.tsx`, add a link right after the `<h1>`:

```tsx
      <h1 className="font-display text-3xl font-medium text-ink">Orders</h1>
      <a
        href="/api/admin/customer-history/export"
        className="mt-2 inline-block font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 hover:decoration-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
      >
        Download customer history (CSV)
      </a>
```

(A plain link, not a fetch-driven button — the browser handles the download natively via the route's `Content-Disposition: attachment` header, no JS needed.)

- [ ] **Step 6: Manual smoke check**

Run: `npm run dev`, sign in at `/admin/login`, visit `/admin/orders`, click "Download customer history (CSV)" — confirm a file downloads (it may be just a header row if the retention cron hasn't archived anything yet locally, which is expected).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS — no dedicated test file for the page-level link addition (established precedent), covered by the manual smoke check above.

- [ ] **Step 8: Commit**

```bash
git add app/api/admin/customer-history app/admin/orders/page.tsx
git commit -m "feat: add admin CSV export for archived customer history"
```

---

## Task 11: PWA Icon and Manifest

**Files:**
- Create: `app/icon.tsx`
- Create: `app/manifest.ts`

**Interfaces:**
- Consumes: `next/og`'s `ImageResponse`
- Produces: a generated `/icon` route and `/manifest.webmanifest`, referenced by Task 12's layout.

- [ ] **Step 1: Generate the app icon**

Create `app/icon.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#17191d',
          color: '#eeeae1',
          fontSize: 280,
          fontWeight: 600,
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
```

(Uses the design system's own `ink`/`paper` colors directly, since `app/icon.tsx` renders outside the Tailwind-themed DOM and can't reference CSS custom properties.)

- [ ] **Step 2: Write the manifest**

Create `app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DBC Holder',
    short_name: 'DBC Holder',
    description: 'Your digital business card, saved to your phone.',
    start_url: '/holder',
    scope: '/holder',
    display: 'standalone',
    background_color: '#eeeae1',
    theme_color: '#17191d',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
```

`scope`/`start_url` both point at `/holder` — installability is meaningful there, not across the whole app, even though the icon route itself also improves the browser-tab favicon everywhere (a reasonable side effect; there was no custom icon before this).

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`, visit `http://localhost:3000/icon` — confirm a 512×512 PNG renders. Visit `http://localhost:3000/manifest.webmanifest` — confirm valid JSON with `start_url`/`scope` both `/holder`.

- [ ] **Step 4: Commit**

```bash
git add app/icon.tsx app/manifest.ts
git commit -m "feat: add generated app icon and PWA manifest scoped to /holder"
```

---

## Task 12: Service Worker

**Files:**
- Create: `public/holder-sw.js`
- Create: `components/holder/RegisterServiceWorker.tsx`
- Create: `app/holder/layout.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: offline caching for everything under `/holder`, registered automatically by the layout Tasks 13/14 render inside.

- [ ] **Step 1: Write the service worker**

Create `public/holder-sw.js`:

```js
const CACHE_NAME = 'dbc-holder-v1';
const SHELL_URLS = ['/holder'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve from cache immediately when available (fast,
// works offline), refresh the cache in the background from the network.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
```

- [ ] **Step 2: Write the registration component**

Create `components/holder/RegisterServiceWorker.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/holder-sw.js', { scope: '/holder' }).catch(() => {
        // Offline support degrades gracefully without it — nothing to surface to the user.
      });
    }
  }, []);

  return null;
}
```

- [ ] **Step 3: Add the Holder layout**

Create `app/holder/layout.tsx`:

```tsx
import { RegisterServiceWorker } from '@/components/holder/RegisterServiceWorker';

export default function HolderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterServiceWorker />
      {children}
    </>
  );
}
```

(This wraps both `/holder` and `/holder/install`, Tasks 13 and 14 — both need the offline shell.)

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, visit `http://localhost:3000/holder`, open DevTools → Application → Service Workers — confirm `holder-sw.js` registers and activates with scope `/holder`.

- [ ] **Step 5: Commit**

```bash
git add public/holder-sw.js components/holder/RegisterServiceWorker.tsx app/holder/layout.tsx
git commit -m "feat: add offline service worker scoped to /holder"
```

---

## Task 13: Holder Card View

**Files:**
- Create: `components/holder/CardActions.tsx`
- Test: `components/holder/CardActions.test.tsx`
- Create: `app/holder/page.tsx`
- Test: `app/holder/page.test.tsx`

**Interfaces:**
- Consumes: `getCard` (Task 2), `buildVCard` (Task 3), `getTemplate` (`lib/templates/registry.ts`), `PhoneFrame` (`components/builder/PhoneFrame.tsx`)
- Produces: `/holder` — consumed by Task 14 (install page redirects here) and Task 15 (E2E).

- [ ] **Step 1: Write CardActions' failing tests**

Create `components/holder/CardActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardActions } from './CardActions';
import type { CardData } from '@/lib/templates/types';

const data: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('CardActions', () => {
  it('renders Save to Contacts and Share buttons', () => {
    render(<CardActions data={data} />);
    expect(screen.getByRole('button', { name: /save to contacts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
  });

  it('triggers a vCard download when Save to Contacts is clicked', async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();

    render(<CardActions data={data} />);
    await user.click(screen.getByRole('button', { name: /save to contacts/i }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('shares via the Web Share API when available', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    render(<CardActions data={data} />);
    await user.click(screen.getByRole('button', { name: /^share$/i }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Juan Dela Cruz' }));
  });

  it('falls back to copying the link when Web Share is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CardActions data={data} />);
    await user.click(screen.getByRole('button', { name: /^share$/i }));

    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- CardActions`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write CardActions**

Create `components/holder/CardActions.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { buildVCard } from '@/lib/vcard';
import type { CardData } from '@/lib/templates/types';

export function CardActions({ data }: { data: CardData }) {
  const [shareError, setShareError] = useState<string | null>(null);

  function handleSaveContact() {
    const vcard = buildVCard(data);
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.firstName}-${data.lastName}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setShareError(null);
    const shareData = {
      title: `${data.firstName} ${data.lastName}`,
      text: `${data.jobTitle} at ${data.company}`,
      url: `${window.location.origin}/holder`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareError("Link copied — your browser can't open the share sheet directly.");
    } catch {
      setShareError("Couldn't share or copy the link.");
    }
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={handleSaveContact}
          className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
        >
          Save to Contacts
        </button>
        <button
          onClick={handleShare}
          className="rounded-full border border-line px-6 py-3 font-medium text-ink transition-colors hover:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
        >
          Share
        </button>
      </div>
      {shareError && (
        <p role="status" className="text-center text-sm text-ink-soft">
          {shareError}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run CardActions tests to verify they pass**

Run: `npm run test -- CardActions`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the Holder page's failing tests**

Create `app/holder/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/holder-storage', () => ({
  getCard: vi.fn(),
}));

import { getCard } from '@/lib/holder-storage';
import HolderPage from './page';

beforeEach(() => vi.clearAllMocks());

describe('HolderPage', () => {
  it('shows an empty state when no card is saved', async () => {
    vi.mocked(getCard).mockResolvedValue(null);
    render(<HolderPage />);
    expect(await screen.findByText(/no card yet/i)).toBeInTheDocument();
  });

  it('renders the saved card and its actions', async () => {
    vi.mocked(getCard).mockResolvedValue({
      data: {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        jobTitle: 'Sales Director',
        company: 'ABC Corporation',
        mobile: '+639171234567',
        email: 'juan@abc.com',
      },
      style: {},
      templateId: 'corporate-vertical',
      savedAt: new Date().toISOString(),
    });
    render(<HolderPage />);
    expect(await screen.findByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to contacts/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm run test -- "app/holder/page.test.tsx"`
Expected: FAIL — page does not exist.

- [ ] **Step 7: Write the Holder page**

Create `app/holder/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getTemplate } from '@/lib/templates/registry';
import { PhoneFrame } from '@/components/builder/PhoneFrame';
import { CardActions } from '@/components/holder/CardActions';
import { getCard, type HolderCard } from '@/lib/holder-storage';

export default function HolderPage() {
  const [card, setCard] = useState<HolderCard | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setCard(await getCard());
    })();
  }, []);

  if (card === undefined) {
    return <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Loading…</p>;
  }

  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-scan">DBC Holder</p>
        <h1 className="font-display text-3xl font-medium text-ink">No card yet</h1>
        <p className="text-ink-soft">Scan your provisioning QR to add a card to this phone.</p>
      </main>
    );
  }

  const template = getTemplate(card.templateId);
  const Component = template.component;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">DBC Holder</p>
      <PhoneFrame orientation={template.orientation}>
        <Component data={card.data} style={card.style} />
      </PhoneFrame>
      <CardActions data={card.data} />
    </main>
  );
}
```

- [ ] **Step 8: Run Holder page tests to verify they pass**

Run: `npm run test -- "app/holder/page.test.tsx"`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add components/holder/CardActions.tsx components/holder/CardActions.test.tsx app/holder/page.tsx app/holder/page.test.tsx
git commit -m "feat: add the Holder card view with save-to-contacts and share"
```

---

## Task 14: Install/Transfer Page

**Files:**
- Create: `app/holder/install/page.tsx`
- Test: `app/holder/install/page.test.tsx`

**Interfaces:**
- Consumes: `decodeCard` (Task 1), `saveCard`/`hasCard` (Task 2)
- Produces: `/holder/install` — the QR's target, consumed by Task 15 (E2E).

- [ ] **Step 1: Write the failing tests**

Create `app/holder/install/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/card-encoding', () => ({
  decodeCard: vi.fn(),
}));

vi.mock('@/lib/holder-storage', () => ({
  hasCard: vi.fn(),
  saveCard: vi.fn(),
}));

import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { hasCard, saveCard } from '@/lib/holder-storage';
import HolderInstallPage from './page';

const replace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace } as never);
  window.location.hash = '';
});

describe('HolderInstallPage', () => {
  it('redirects straight to /holder when this device already has a card', async () => {
    vi.mocked(hasCard).mockResolvedValue(true);
    render(<HolderInstallPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
    expect(decodeCard).not.toHaveBeenCalled();
  });

  it('shows an invalid state for an undecodable fragment', async () => {
    vi.mocked(hasCard).mockResolvedValue(false);
    vi.mocked(decodeCard).mockReturnValue(null);
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn.t valid/i);
  });

  it('saves a valid card and redirects to /holder', async () => {
    vi.mocked(hasCard).mockResolvedValue(false);
    const payload = {
      data: { firstName: 'Juan' } as never,
      style: {},
      templateId: 'corporate-vertical',
    };
    vi.mocked(decodeCard).mockReturnValue(payload);
    vi.mocked(saveCard).mockResolvedValue(undefined);
    render(<HolderInstallPage />);
    await waitFor(() => expect(saveCard).toHaveBeenCalledWith(payload));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
  });

  it('shows an error state when saving fails', async () => {
    vi.mocked(hasCard).mockResolvedValue(false);
    vi.mocked(decodeCard).mockReturnValue({ data: {} as never, style: {}, templateId: 'corporate-vertical' });
    vi.mocked(saveCard).mockRejectedValue(new Error('quota exceeded'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- "app/holder/install/page.test.tsx"`
Expected: FAIL — page does not exist.

- [ ] **Step 3: Write the page**

Create `app/holder/install/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { saveCard, hasCard } from '@/lib/holder-storage';

type InstallState = 'checking' | 'saving' | 'success' | 'invalid' | 'error';

export default function HolderInstallPage() {
  const router = useRouter();
  const [state, setState] = useState<InstallState>('checking');

  useEffect(() => {
    (async () => {
      if (await hasCard()) {
        // Already saved on this device — a refresh or a repeat scan of the
        // same QR shouldn't re-process or error, just go straight in.
        router.replace('/holder');
        return;
      }

      const fragment = window.location.hash.slice(1);
      const payload = decodeCard(fragment);
      if (!payload) {
        setState('invalid');
        return;
      }

      setState('saving');
      try {
        await saveCard(payload);
      } catch {
        setState('error');
        return;
      }

      // The raw card data has done its job — clear it from the address bar
      // and history so it doesn't linger there once safely saved.
      window.history.replaceState(null, '', '/holder/install');
      setState('success');
      router.replace('/holder');
    })();
  }, [router]);

  if (state === 'invalid') {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 role="alert" className="font-display text-3xl font-medium text-ink">
          This code isn&apos;t valid
        </h1>
        <p className="text-ink-soft">Ask for a new one and scan it again.</p>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 role="alert" className="font-display text-3xl font-medium text-ink">
          Couldn&apos;t save your card
        </h1>
        <p className="text-ink-soft">Scan the code again to retry.</p>
      </main>
    );
  }

  return (
    <p className="p-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
      {state === 'saving' ? 'Saving your card…' : 'Checking…'}
    </p>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- "app/holder/install/page.test.tsx"`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/holder/install/page.tsx app/holder/install/page.test.tsx
git commit -m "feat: add the standalone card-install transfer page"
```

---

## Task 15: End-to-End — Extend the Commerce Happy Path Through Provisioning

**Files:**
- Modify: `tests/e2e/commerce-happy-path.spec.ts`

**Interfaces:**
- Consumes: the full running app (Tasks 1-14), Commerce's existing flow
- Produces: nothing consumed elsewhere — this is the plan's final verification.

The QR's caption text ("Scan to add to your phone") is unchanged from Commerce's original implementation, so the existing assertion on it still holds. This task extends the test past that point rather than replacing anything.

- [ ] **Step 1: Extend the test**

In `tests/e2e/commerce-happy-path.spec.ts`, after the existing final line:

```ts
  // Back on the customer side: the status page now shows the provisioning QR
  await page.goto(`/checkout/${orderId}/status`);
  await expect(page.getByText(/scan to add to your phone/i)).toBeVisible();
});
```

replace the closing `});` with a continuation of the same test:

```ts
  // Back on the customer side: the status page now shows the provisioning QR
  await page.goto(`/checkout/${orderId}/status`);
  await expect(page.getByText(/scan to add to your phone/i)).toBeVisible();

  // Provisioning + Holder: extract the QR's encoded value (Playwright can't
  // decode a rendered QR image, so the component carries it in a data
  // attribute for exactly this purpose) and complete the transfer as if it
  // had actually been scanned.
  const qrValue = await page.locator('[data-qr-value]').getAttribute('data-qr-value');
  expect(qrValue).toBeTruthy();

  await page.goto(qrValue!);
  await page.waitForURL(/\/holder$/);
  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();
  await expect(page.getByRole('button', { name: /save to contacts/i })).toBeVisible();

  // Refreshing /holder/install with the same (already-consumed-on-this-
  // device) fragment must not error or re-process — it should just land
  // back on /holder.
  await page.goto(qrValue!);
  await page.waitForURL(/\/holder$/);
  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();
});
```

- [ ] **Step 2: Run the full E2E suite**

Run: `npm run db:push` (if not already applied for this session) then `npm run test:e2e`
Expected: PASS (2 tests total — this one plus Builder's existing `builder-happy-path.spec.ts`)

- [ ] **Step 3: Run the full verification suite**

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
```

Expected: `tsc` clean, `lint` 0 errors, `test` all passing, `test:e2e` 2/2 passing.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/commerce-happy-path.spec.ts
git commit -m "test: extend the E2E happy path through provisioning and the Holder"
```

---

## Plan Complete

At this point, a customer can build a card, pay for it, get approved, scan a fully standalone QR to transfer it onto their phone with zero server dependency, and view/save/share it from an installable, offline-capable Holder PWA. Exchange — card-to-card transfer between two Holders — is a separate plan, starting from its own brainstorming → spec → plan cycle.
