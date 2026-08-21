# DBC Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the web-based DBC Builder — template selection, info entry, customization, live preview, and submit-to-Commerce handoff — as a standalone Next.js app.

**Architecture:** Next.js App Router app with server-side API routes backed by Postgres (Drizzle ORM) for anonymous, session-cookie-keyed drafts. Ten hand-coded React template components share one `CardData`/`StyleOverrides` contract so the same component renders both the live preview and (later) the final provisioned card. No login; session is an opaque random cookie.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Drizzle ORM + Postgres (`postgres` driver), Zod, Vercel Blob for logo uploads, Vitest + React Testing Library + MSW for unit/component tests, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-08-21-dbc-builder-design.md`

## Global Constraints

- No user accounts/login anywhere in this sub-project — session is an opaque random cookie (`dbc_session`).
- Required `CardData` fields: `firstName`, `lastName`, `jobTitle`, `company`, `mobile`, `email`. Optional: `address`, `website`, `logoUrl`, `facebook`, `linkedin`, `instagram`, `whatsapp`, `messenger`.
- Exactly 10 templates, hand-coded (not JSON-driven), covering both `vertical` and `horizontal` orientation, split as: Corporate (V+H), Professional (V+H), Modern (V+H), Minimal (V+H), Executive (V), Creative (H).
- Draft rows: soft-expire after 48h of inactivity (`status: 'expired'`); this sub-project does not hard-delete rows (deletion-after-provisioning is owned by a later sub-project).
- The live preview MUST render through the same template component used for final output — no separate render path.
- This plan stops at `POST /api/drafts/:id/submit` marking a draft `submitted` and returning its payload. It does not create Commerce orders, payment flows, or admin UI — those are out of scope.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- Create: `.env.local.example`, `.env.test.example`, `.gitignore`

**Interfaces:**
- Produces: a runnable Next.js dev server, `npm run test` (Vitest), `npm run test:e2e` (Playwright) commands available to every later task.

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --import-alias "@/*" --use-npm --no-src-dir
```

Accept defaults. This creates `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tailwind.config.ts` (or Tailwind v4 CSS-based config, whichever the installed version scaffolds).

- [ ] **Step 2: Install additional dependencies**

```bash
npm install drizzle-orm postgres zod @vercel/blob
npm install -D drizzle-kit vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw @playwright/test dotenv
```

- [ ] **Step 3: Add test tooling config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: { baseURL: 'http://localhost:3000' },
});
```

- [ ] **Step 4: Add npm scripts**

Edit `package.json` `scripts` to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push"
  }
}
```

- [ ] **Step 5: Add env file templates**

Create `.env.local.example`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5434/dbc_dev
BLOB_READ_WRITE_TOKEN=
```

Create `.env.test.example`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5433/dbc_test
```

Copy both to `.env.local` and `.env.test` respectively (these are gitignored) for local development — actual values depend on the developer's local Postgres.

- [ ] **Step 6: Verify the dev server runs**

Run: `npm run dev`, visit `http://localhost:3000`, confirm the default Next.js page loads. Stop the server.

- [ ] **Step 7: Verify Vitest runs with zero tests**

Run: `npm run test`
Expected: Vitest reports "No test files found" without crashing (confirms config is valid).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and Playwright tooling"
```

---

## Task 2: Card Data Types and Validation Schema

**Files:**
- Create: `lib/templates/types.ts`
- Create: `lib/validation/card-schema.ts`
- Test: `lib/validation/card-schema.test.ts`

**Interfaces:**
- Consumes: nothing (foundational)
- Produces: `CardData`, `StyleOverrides`, `Orientation`, `TemplateCategory` types (`lib/templates/types.ts`); `cardDataSchema`, `cardDataPartialSchema`, `styleOverridesSchema` Zod schemas (`lib/validation/card-schema.ts`) — consumed by Task 10 (DB queries), Tasks 11-14 (API routes), Task 17 (InfoForm).

- [ ] **Step 1: Write the failing test**

Create `lib/validation/card-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cardDataSchema, cardDataPartialSchema, styleOverridesSchema } from './card-schema';

describe('cardDataSchema', () => {
  const valid = {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    jobTitle: 'Sales Director',
    company: 'ABC Corporation',
    mobile: '+639171234567',
    email: 'juan@abc.com',
  };

  it('accepts a payload with only required fields', () => {
    expect(cardDataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a payload missing a required field', () => {
    const { email, ...rest } = valid;
    expect(cardDataSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(cardDataSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('accepts optional fields when valid', () => {
    const result = cardDataSchema.safeParse({
      ...valid,
      website: 'https://abc.com',
      linkedin: 'https://linkedin.com/in/juan',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid optional url', () => {
    expect(cardDataSchema.safeParse({ ...valid, website: 'not-a-url' }).success).toBe(false);
  });
});

describe('cardDataPartialSchema', () => {
  it('accepts a single-field patch', () => {
    expect(cardDataPartialSchema.safeParse({ firstName: 'Maria' }).success).toBe(true);
  });

  it('accepts an empty object', () => {
    expect(cardDataPartialSchema.safeParse({}).success).toBe(true);
  });
});

describe('styleOverridesSchema', () => {
  it('accepts a valid hex accent color and font size step', () => {
    expect(styleOverridesSchema.safeParse({ accentColor: '#1a2b3c', fontSizeStep: 1 }).success).toBe(true);
  });

  it('rejects a non-hex accent color', () => {
    expect(styleOverridesSchema.safeParse({ accentColor: 'blue' }).success).toBe(false);
  });

  it('rejects a font size step outside -2..2', () => {
    expect(styleOverridesSchema.safeParse({ fontSizeStep: 5 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- card-schema`
Expected: FAIL — `card-schema.ts` does not exist.

- [ ] **Step 3: Write the types**

Create `lib/templates/types.ts`:

```ts
import type { ComponentType } from 'react';

export interface CardData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  mobile: string;
  email: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  whatsapp?: string;
  messenger?: string;
}

export interface StyleOverrides {
  accentColor?: string;
  fontSizeStep?: number;
}

export type Orientation = 'vertical' | 'horizontal';

export type TemplateCategory =
  | 'corporate'
  | 'professional'
  | 'modern'
  | 'minimal'
  | 'executive'
  | 'creative';

export interface CustomizableFieldBounds {
  accentColor: boolean;
  fontSizeStep: { min: number; max: number } | false;
  logo: boolean;
}

export interface TemplateProps {
  data: CardData;
  style: StyleOverrides;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  orientation: Orientation;
  customizable: CustomizableFieldBounds;
  component: ComponentType<TemplateProps>;
}
```

- [ ] **Step 4: Write the validation schema**

Create `lib/validation/card-schema.ts`:

```ts
import { z } from 'zod';

export const cardDataSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(150),
  company: z.string().min(1).max(150),
  mobile: z.string().min(7).max(30),
  email: z.string().email(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  facebook: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  instagram: z.string().url().optional(),
  whatsapp: z.string().max(30).optional(),
  messenger: z.string().url().optional(),
});

export const cardDataPartialSchema = cardDataSchema.partial();

export const styleOverridesSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontSizeStep: z.number().int().min(-2).max(2).optional(),
});

export type CardDataInput = z.infer<typeof cardDataSchema>;
export type CardDataPartialInput = z.infer<typeof cardDataPartialSchema>;
export type StyleOverridesInput = z.infer<typeof styleOverridesSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- card-schema`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/templates/types.ts lib/validation/card-schema.ts lib/validation/card-schema.test.ts
git commit -m "feat: add CardData types and Zod validation schema"
```

---

## Task 3: Postgres Schema and DB Client

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/client.ts`
- Create: `drizzle.config.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `cardDrafts` table (`lib/db/schema.ts`), `db` client instance (`lib/db/client.ts`) — consumed by Task 10 (DB queries).

- [ ] **Step 1: Write the Drizzle schema**

Create `lib/db/schema.ts`:

```ts
import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import type { StyleOverrides } from '@/lib/templates/types';

export const draftStatusEnum = pgEnum('draft_status', ['draft', 'submitted', 'expired']);
export const orientationEnum = pgEnum('orientation', ['vertical', 'horizontal']);

export const cardDrafts = pgTable('card_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  templateId: varchar('template_id', { length: 64 }).notNull(),
  orientation: orientationEnum('orientation').notNull(),
  status: draftStatusEnum('status').notNull().default('draft'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  jobTitle: varchar('job_title', { length: 150 }),
  company: varchar('company', { length: 150 }),
  mobile: varchar('mobile', { length: 30 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  website: varchar('website', { length: 255 }),
  logoUrl: text('logo_url'),
  facebook: varchar('facebook', { length: 255 }),
  linkedin: varchar('linkedin', { length: 255 }),
  instagram: varchar('instagram', { length: 255 }),
  whatsapp: varchar('whatsapp', { length: 255 }),
  messenger: varchar('messenger', { length: 255 }),
  styleOverrides: jsonb('style_overrides').$type<StyleOverrides>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type CardDraftRow = typeof cardDrafts.$inferSelect;
export type CardDraftInsert = typeof cardDrafts.$inferInsert;
```

- [ ] **Step 2: Write the DB client**

Create `lib/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Write the Drizzle config**

Create `drizzle.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Start a local Postgres and push the schema**

Run:

Host port 5432 is already in use by an unrelated project's Postgres container on this machine — use 5434 for the dev container instead (confirmed free alongside 5433 for the test container):

```bash
docker run --rm -d --name dbc-dev-pg -p 5434:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dbc_dev postgres:16
docker run --rm -d --name dbc-test-pg -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dbc_test postgres:16
```

Update `.env.local` (created from `.env.local.example` in Task 1) to `DATABASE_URL=postgres://postgres:postgres@localhost:5434/dbc_dev` — the `.example` file's `5432` was written before this port conflict was discovered; fix both the tracked `.env.local.example` and your local `.env.local`.

```bash
npm run db:push   # against .env.local (dbc_dev, port 5434)
DATABASE_URL=postgres://postgres:postgres@localhost:5433/dbc_test npm run db:push   # against dbc_test
```

Expected: `drizzle-kit push` reports the `card_drafts` table created in both databases with no errors.

- [ ] **Step 5: Verify with a smoke script**

Run:

```bash
node -e "
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/dbc_dev');
sql\`select count(*) from card_drafts\`.then(r => { console.log('OK', r); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
"
```

Expected: prints `OK` with a zero count row.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/client.ts drizzle.config.ts drizzle
git commit -m "feat: add card_drafts Postgres schema and Drizzle client"
```

---

## Task 4: Template Registry Contract and Style Utilities

**Files:**
- Create: `lib/templates/registry.ts`
- Create: `lib/templates/style-utils.ts`
- Test: `lib/templates/registry.test.ts`
- Test: `lib/templates/style-utils.test.ts`

**Interfaces:**
- Consumes: `TemplateDefinition`, `Orientation`, `TemplateCategory`, `StyleOverrides` (Task 2)
- Produces: `filterTemplates(all, filter)`, `templates` (array, empty until Tasks 5-9 populate it), `listTemplates(filter)`, `getTemplate(id)` (`lib/templates/registry.ts`); `FONT_SIZE_SCALE`, `fontSizeClass(baseIndex, step)`, `resolveAccentColor(style, fallback)` (`lib/templates/style-utils.ts`) — consumed by Tasks 5-9 (template components), Task 16 (gallery), Task 18 (customize panel).

- [ ] **Step 1: Write the failing tests**

Create `lib/templates/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterTemplates } from './registry';
import type { TemplateDefinition } from './types';

const fixture = (overrides: Partial<TemplateDefinition>): TemplateDefinition => ({
  id: 'x',
  name: 'X',
  category: 'corporate',
  orientation: 'vertical',
  customizable: { accentColor: true, fontSizeStep: { min: -2, max: 2 }, logo: true },
  component: () => null,
  ...overrides,
});

describe('filterTemplates', () => {
  const all = [
    fixture({ id: 'a', category: 'corporate', orientation: 'vertical' }),
    fixture({ id: 'b', category: 'corporate', orientation: 'horizontal' }),
    fixture({ id: 'c', category: 'minimal', orientation: 'vertical' }),
  ];

  it('returns all templates with no filter', () => {
    expect(filterTemplates(all)).toHaveLength(3);
  });

  it('filters by orientation', () => {
    expect(filterTemplates(all, { orientation: 'vertical' }).map(t => t.id)).toEqual(['a', 'c']);
  });

  it('filters by category', () => {
    expect(filterTemplates(all, { category: 'corporate' }).map(t => t.id)).toEqual(['a', 'b']);
  });

  it('filters by both', () => {
    expect(filterTemplates(all, { category: 'corporate', orientation: 'horizontal' }).map(t => t.id)).toEqual(['b']);
  });
});
```

Create `lib/templates/style-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fontSizeClass, resolveAccentColor, FONT_SIZE_SCALE } from './style-utils';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- templates`
Expected: FAIL — `registry.ts` and `style-utils.ts` do not exist.

- [ ] **Step 3: Write the registry**

Create `lib/templates/registry.ts`:

```ts
import type { TemplateDefinition, Orientation, TemplateCategory } from './types';

export const templates: TemplateDefinition[] = [];

export function filterTemplates(
  all: TemplateDefinition[],
  filter?: { orientation?: Orientation; category?: TemplateCategory }
): TemplateDefinition[] {
  return all.filter(
    t =>
      (!filter?.orientation || t.orientation === filter.orientation) &&
      (!filter?.category || t.category === filter.category)
  );
}

export function listTemplates(filter?: { orientation?: Orientation; category?: TemplateCategory }) {
  return filterTemplates(templates, filter);
}

export function getTemplate(id: string): TemplateDefinition {
  const found = templates.find(t => t.id === id);
  if (!found) throw new Error(`Unknown template: ${id}`);
  return found;
}
```

- [ ] **Step 4: Write style utilities**

Create `lib/templates/style-utils.ts`:

```ts
import type { StyleOverrides } from './types';

export const FONT_SIZE_SCALE = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];

export function fontSizeClass(baseIndex: number, step: number = 0): string {
  const idx = Math.min(FONT_SIZE_SCALE.length - 1, Math.max(0, baseIndex + step));
  return FONT_SIZE_SCALE[idx];
}

export function resolveAccentColor(style: StyleOverrides, fallback: string): string {
  return style.accentColor ?? fallback;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- templates`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/templates/registry.ts lib/templates/style-utils.ts lib/templates/registry.test.ts lib/templates/style-utils.test.ts
git commit -m "feat: add template registry contract and style utilities"
```

---

## Task 5: Corporate Templates (Vertical + Horizontal)

**Files:**
- Create: `components/templates/CorporateVertical.tsx`
- Create: `components/templates/CorporateHorizontal.tsx`
- Modify: `lib/templates/registry.ts` (push 2 entries into `templates`)
- Test: `components/templates/CorporateVertical.test.tsx`
- Test: `components/templates/CorporateHorizontal.test.tsx`

**Interfaces:**
- Consumes: `TemplateProps`, `CardData`, `StyleOverrides` (Task 2); `templates`, `TemplateDefinition` (Task 4); `fontSizeClass`, `resolveAccentColor` (Task 4)
- Produces: `CorporateVertical`, `CorporateHorizontal` components; registry entries `id: 'corporate-vertical'`, `id: 'corporate-horizontal'` — consumed by Task 16 (gallery must list them), Task 19 (live preview renders them).

- [ ] **Step 1: Write the failing tests**

Create `components/templates/CorporateVertical.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorporateVertical } from './CorporateVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('CorporateVertical', () => {
  it('renders with only required fields', () => {
    render(<CorporateVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links when present', () => {
    render(<CorporateVertical data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('applies an accent color override', () => {
    const { container } = render(<CorporateVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
```

Create `components/templates/CorporateHorizontal.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorporateHorizontal } from './CorporateHorizontal';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('CorporateHorizontal', () => {
  it('renders with only required fields', () => {
    render(<CorporateHorizontal data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links when present', () => {
    render(<CorporateHorizontal data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('applies an accent color override', () => {
    const { container } = render(<CorporateHorizontal data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- Corporate`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Write the components**

Create `components/templates/CorporateVertical.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function CorporateVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#1e3a8a');
  return (
    <div
      className="flex flex-col justify-between w-[320px] h-[560px] rounded-2xl bg-white p-6 shadow-lg border-t-8"
      style={{ '--accent': accent, borderTopColor: accent } as React.CSSProperties}
    >
      <div>
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-bold text-gray-900`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-600`}>{data.jobTitle}</p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold`} style={{ color: accent }}>
          {data.company}
        </p>
      </div>
      <div className="text-sm text-gray-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

Create `components/templates/CorporateHorizontal.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function CorporateHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#1e3a8a');
  return (
    <div
      className="flex flex-row w-[560px] h-[320px] rounded-2xl bg-white p-6 shadow-lg border-l-8 gap-6"
      style={{ '--accent': accent, borderLeftColor: accent } as React.CSSProperties}
    >
      <div className="flex-1 flex flex-col justify-center">
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-bold text-gray-900`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-600`}>{data.jobTitle}</p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold`} style={{ color: accent }}>
          {data.company}
        </p>
      </div>
      <div className="flex-1 flex flex-col justify-center text-sm text-gray-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Register both templates**

Modify `lib/templates/registry.ts` — add imports and push calls after the `templates` declaration:

```ts
import { CorporateVertical } from '@/components/templates/CorporateVertical';
import { CorporateHorizontal } from '@/components/templates/CorporateHorizontal';

templates.push(
  {
    id: 'corporate-vertical',
    name: 'Corporate',
    category: 'corporate',
    orientation: 'vertical',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: CorporateVertical,
  },
  {
    id: 'corporate-horizontal',
    name: 'Corporate',
    category: 'corporate',
    orientation: 'horizontal',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: CorporateHorizontal,
  }
);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- Corporate`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add components/templates/CorporateVertical.tsx components/templates/CorporateHorizontal.tsx \
  components/templates/CorporateVertical.test.tsx components/templates/CorporateHorizontal.test.tsx \
  lib/templates/registry.ts
git commit -m "feat: add Corporate vertical and horizontal templates"
```

---

## Task 6: Professional Templates (Vertical + Horizontal)

**Files:**
- Create: `components/templates/ProfessionalVertical.tsx`, `components/templates/ProfessionalHorizontal.tsx`
- Modify: `lib/templates/registry.ts`
- Test: `components/templates/ProfessionalVertical.test.tsx`, `components/templates/ProfessionalHorizontal.test.tsx`

**Interfaces:**
- Consumes/Produces: identical shape to Task 5, with `id: 'professional-vertical'` / `id: 'professional-horizontal'`, `category: 'professional'`.

- [ ] **Step 1: Write the failing tests**

Create `components/templates/ProfessionalVertical.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfessionalVertical } from './ProfessionalVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('ProfessionalVertical', () => {
  it('renders with only required fields', () => {
    render(<ProfessionalVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links when present', () => {
    render(<ProfessionalVertical data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('applies an accent color override', () => {
    const { container } = render(<ProfessionalVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
```

Create `components/templates/ProfessionalHorizontal.test.tsx` with the identical three cases, importing `ProfessionalHorizontal` in place of `ProfessionalVertical`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- Professional`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Write the components**

Create `components/templates/ProfessionalVertical.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ProfessionalVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#334155');
  return (
    <div
      className="flex flex-col items-center text-center w-[320px] h-[560px] rounded-2xl bg-slate-50 p-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
      <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold uppercase tracking-wide`} style={{ color: accent }}>
        {data.jobTitle}
      </p>
      <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-medium text-slate-900 mt-1`}>
        {data.firstName} {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-slate-600 mt-1`}>{data.company}</p>
      <div className="mt-6 text-sm text-slate-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex justify-center gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

Create `components/templates/ProfessionalHorizontal.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ProfessionalHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#334155');
  return (
    <div
      className="flex flex-col items-center justify-center text-center w-[560px] h-[320px] rounded-2xl bg-slate-50 p-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-3" />}
      <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold uppercase tracking-wide`} style={{ color: accent }}>
        {data.jobTitle}
      </p>
      <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-medium text-slate-900 mt-1`}>
        {data.firstName} {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-slate-600 mt-1`}>{data.company}</p>
      <div className="mt-4 text-sm text-slate-700 flex gap-6">
        <span>{data.mobile}</span>
        <span>{data.email}</span>
        {data.website && <span>{data.website}</span>}
      </div>
      {data.address && <p className="text-sm text-slate-700">{data.address}</p>}
      <div className="flex justify-center gap-3 pt-2">
        {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
        {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
        {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
        {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
        {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Register both templates**

Modify `lib/templates/registry.ts` — add imports and a second `templates.push(...)` call with `id: 'professional-vertical'`, `id: 'professional-horizontal'`, `category: 'professional'`, `customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true }`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- Professional`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add components/templates/ProfessionalVertical.tsx components/templates/ProfessionalHorizontal.tsx \
  components/templates/ProfessionalVertical.test.tsx components/templates/ProfessionalHorizontal.test.tsx \
  lib/templates/registry.ts
git commit -m "feat: add Professional vertical and horizontal templates"
```

---

## Task 7: Modern Templates (Vertical + Horizontal)

**Files:**
- Create: `components/templates/ModernVertical.tsx`, `components/templates/ModernHorizontal.tsx`
- Modify: `lib/templates/registry.ts`
- Test: `components/templates/ModernVertical.test.tsx`, `components/templates/ModernHorizontal.test.tsx`

**Interfaces:**
- Consumes/Produces: same shape as Task 5, with `id: 'modern-vertical'` / `id: 'modern-horizontal'`, `category: 'modern'`.

- [ ] **Step 1: Write the failing tests**

Create `components/templates/ModernVertical.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModernVertical } from './ModernVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('ModernVertical', () => {
  it('renders with only required fields', () => {
    render(<ModernVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links when present', () => {
    render(<ModernVertical data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('applies an accent color override', () => {
    const { container } = render(<ModernVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
```

Create `components/templates/ModernHorizontal.test.tsx` with the identical three cases, importing `ModernHorizontal` in place of `ModernVertical`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- Modern`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Write the components**

Create `components/templates/ModernVertical.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ModernVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#22d3ee');
  return (
    <div
      className="relative overflow-hidden w-[320px] h-[560px] rounded-2xl bg-gray-900 text-white p-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="absolute -top-10 -right-16 w-48 h-48 rotate-45"
        style={{ background: accent, opacity: 0.25 }}
      />
      {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-6 relative" />}
      <h1 className={`${fontSizeClass(5, style.fontSizeStep)} font-black relative`}>
        {data.firstName}
        <br />
        {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold mt-2 relative`} style={{ color: accent }}>
        {data.jobTitle}
      </p>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-300 relative`}>{data.company}</p>
      <div className="mt-8 text-sm text-gray-300 space-y-1 relative">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

Create `components/templates/ModernHorizontal.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ModernHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#22d3ee');
  return (
    <div
      className="relative overflow-hidden flex flex-row w-[560px] h-[320px] rounded-2xl bg-gray-900 text-white p-6 gap-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="absolute -bottom-16 -left-16 w-48 h-48 rotate-45"
        style={{ background: accent, opacity: 0.25 }}
      />
      <div className="flex-1 relative">
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
        <h1 className={`${fontSizeClass(5, style.fontSizeStep)} font-black`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold`} style={{ color: accent }}>
          {data.jobTitle}
        </p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-300`}>{data.company}</p>
      </div>
      <div className="flex-1 flex flex-col justify-center text-sm text-gray-300 space-y-1 relative">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Register both templates**

Modify `lib/templates/registry.ts` — push `id: 'modern-vertical'`, `id: 'modern-horizontal'`, `category: 'modern'`, same `customizable` shape.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- Modern`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add components/templates/ModernVertical.tsx components/templates/ModernHorizontal.tsx \
  components/templates/ModernVertical.test.tsx components/templates/ModernHorizontal.test.tsx \
  lib/templates/registry.ts
git commit -m "feat: add Modern vertical and horizontal templates"
```

---

## Task 8: Minimal Templates (Vertical + Horizontal)

**Files:**
- Create: `components/templates/MinimalVertical.tsx`, `components/templates/MinimalHorizontal.tsx`
- Modify: `lib/templates/registry.ts`
- Test: `components/templates/MinimalVertical.test.tsx`, `components/templates/MinimalHorizontal.test.tsx`

**Interfaces:**
- Consumes/Produces: same shape as Task 5, with `id: 'minimal-vertical'` / `id: 'minimal-horizontal'`, `category: 'minimal'`. `customizable.logo: false` (minimal templates omit the logo by design) and `customizable.accentColor: true` restricted to a thin single-line divider rather than a background.

- [ ] **Step 1: Write the failing tests**

Create `components/templates/MinimalVertical.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MinimalVertical } from './MinimalVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('MinimalVertical', () => {
  it('renders with only required fields', () => {
    render(<MinimalVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links, but never a logo, even when logoUrl is set', () => {
    render(
      <MinimalVertical
        data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan', logoUrl: 'https://abc.com/logo.png' }}
        style={{}}
      />
    );
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies an accent color override to the divider', () => {
    render(<MinimalVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const divider = screen.getByTestId('accent-divider');
    expect(divider).toHaveStyle({ backgroundColor: '#ff0000' });
  });
});
```

Create `components/templates/MinimalHorizontal.test.tsx` with the identical three cases, importing `MinimalHorizontal` in place of `MinimalVertical`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- Minimal`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Write the components**

Create `components/templates/MinimalVertical.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function MinimalVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#000000');
  return (
    <div className="w-[320px] h-[560px] bg-white p-8 flex flex-col justify-center">
      <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-light text-gray-900`}>
        {data.firstName} {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.company}</p>
      <div data-testid="accent-divider" className="h-0.5 w-12 my-6" style={{ backgroundColor: accent }} />
      <div className="text-sm text-gray-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

Create `components/templates/MinimalHorizontal.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function MinimalHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#000000');
  return (
    <div className="w-[560px] h-[320px] bg-white p-8 flex flex-row items-center gap-8">
      <div className="flex-1">
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-light text-gray-900`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.company}</p>
      </div>
      <div data-testid="accent-divider" className="w-0.5 self-stretch" style={{ backgroundColor: accent }} />
      <div className="flex-1 text-sm text-gray-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Register both templates**

Modify `lib/templates/registry.ts` — push `id: 'minimal-vertical'`, `id: 'minimal-horizontal'`, `category: 'minimal'`, `customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: false }`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- Minimal`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add components/templates/MinimalVertical.tsx components/templates/MinimalHorizontal.tsx \
  components/templates/MinimalVertical.test.tsx components/templates/MinimalHorizontal.test.tsx \
  lib/templates/registry.ts
git commit -m "feat: add Minimal vertical and horizontal templates"
```

---

## Task 9: Executive (Vertical) and Creative (Horizontal) Templates

**Files:**
- Create: `components/templates/ExecutiveVertical.tsx`, `components/templates/CreativeHorizontal.tsx`
- Modify: `lib/templates/registry.ts`
- Test: `components/templates/ExecutiveVertical.test.tsx`, `components/templates/CreativeHorizontal.test.tsx`

**Interfaces:**
- Consumes/Produces: same shape as Task 5, with `id: 'executive-vertical'` (`category: 'executive'`) and `id: 'creative-horizontal'` (`category: 'creative'`). This is the 9th and 10th template — after this task `templates.length === 10`.

- [ ] **Step 1: Write the failing tests**

Create `components/templates/ExecutiveVertical.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutiveVertical } from './ExecutiveVertical';
import type { CardData } from '@/lib/templates/types';

const required: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('ExecutiveVertical', () => {
  it('renders with only required fields', () => {
    render(<ExecutiveVertical data={required} style={{}} />);
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
  });

  it('renders optional website and social links when present', () => {
    render(<ExecutiveVertical data={{ ...required, website: 'https://abc.com', linkedin: 'https://linkedin.com/in/juan' }} style={{}} />);
    expect(screen.getByText('https://abc.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://linkedin.com/in/juan');
  });

  it('applies an accent color override', () => {
    const { container } = render(<ExecutiveVertical data={required} style={{ accentColor: '#ff0000' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
  });
});
```

Create `components/templates/CreativeHorizontal.test.tsx` with the identical three cases, importing `CreativeHorizontal` in place of `ExecutiveVertical`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- "Executive|Creative"`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Write the components**

Create `components/templates/ExecutiveVertical.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ExecutiveVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#b45309');
  return (
    <div
      className="w-[320px] h-[560px] rounded-2xl bg-gray-950 text-gray-100 p-6 flex flex-col justify-between shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div>
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-6" />}
        <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold uppercase tracking-widest`} style={{ color: accent }}>
          {data.jobTitle}
        </p>
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-serif mt-2`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-400 font-serif`}>{data.company}</p>
      </div>
      <div className="text-sm text-gray-300 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

Create `components/templates/CreativeHorizontal.tsx`:

```tsx
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function CreativeHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#ec4899');
  return (
    <div
      className="relative overflow-hidden w-[560px] h-[320px] rounded-3xl bg-white flex flex-row shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="w-[220px] h-full flex flex-col justify-center items-center p-6 text-white"
        style={{ background: accent, clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)' }}
      >
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-3" />}
        <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-bold text-center`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(1, style.fontSizeStep)} text-center`}>{data.jobTitle}</p>
      </div>
      <div className="flex-1 flex flex-col justify-center p-6 text-sm text-gray-700 space-y-1">
        <p className="font-semibold text-gray-900">{data.company}</p>
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Register both templates**

Modify `lib/templates/registry.ts` — push `id: 'executive-vertical'` (`category: 'executive'`) and `id: 'creative-horizontal'` (`category: 'creative'`), both with `customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true }`.

- [ ] **Step 5: Run tests to verify they pass, and verify the full registry**

Run: `npm run test -- "Executive|Creative"`
Expected: PASS (6 tests)

Then run: `npm run test -- registry`
Add one more assertion to `lib/templates/registry.test.ts` in this step, verifying the real registry (not just fixtures):

```ts
import { templates } from './registry';

describe('templates (real registry)', () => {
  it('has exactly 10 templates covering both orientations', () => {
    expect(templates).toHaveLength(10);
    expect(templates.filter(t => t.orientation === 'vertical')).toHaveLength(6);
    expect(templates.filter(t => t.orientation === 'horizontal')).toHaveLength(4);
    expect(new Set(templates.map(t => t.id)).size).toBe(10);
  });
});
```

Run: `npm run test -- registry`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/templates/ExecutiveVertical.tsx components/templates/CreativeHorizontal.tsx \
  components/templates/ExecutiveVertical.test.tsx components/templates/CreativeHorizontal.test.tsx \
  lib/templates/registry.ts lib/templates/registry.test.ts
git commit -m "feat: add Executive and Creative templates, completing the 10-template set"
```

---

## Task 10: Draft DB Query Helpers

**Files:**
- Create: `lib/db/drafts.ts`
- Test: `lib/db/drafts.test.ts`

**Interfaces:**
- Consumes: `db`, `cardDrafts` (Task 3); `CardDataPartialInput`, `StyleOverridesInput` (Task 2)
- Produces: `createDraft`, `getDraftById`, `updateDraft`, `submitDraft`, `expireStaleDrafts` (`lib/db/drafts.ts`) — consumed by Tasks 11-15 (API routes).

This task requires a live test Postgres (`dbc_test`, started in Task 3 Step 4). Ensure `.env.test` points at it before running these tests.

- [ ] **Step 1: Write the failing tests**

Create `lib/db/drafts.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { cardDrafts } from './schema';
import { createDraft, getDraftById, updateDraft, submitDraft, expireStaleDrafts } from './drafts';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('createDraft', () => {
  it('creates a draft with defaults', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    expect(draft.status).toBe('draft');
    expect(draft.styleOverrides).toEqual({});
  });
});

describe('getDraftById', () => {
  it('returns the draft when it exists', async () => {
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const fetched = await getDraftById(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('returns null when it does not exist', async () => {
    expect(await getDraftById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('updateDraft', () => {
  it('patches fields and bumps updatedAt', async () => {
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const updated = await updateDraft(created.id, { firstName: 'Juan', email: 'juan@abc.com' });
    expect(updated?.firstName).toBe('Juan');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });
});

describe('submitDraft', () => {
  it('marks the draft submitted', async () => {
    const created = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const submitted = await submitDraft(created.id);
    expect(submitted?.status).toBe('submitted');
  });
});

describe('expireStaleDrafts', () => {
  it('expires only draft-status rows older than the cutoff', async () => {
    const stale = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await db.update(cardDrafts).set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) }).where(eq(cardDrafts.id, stale.id));
    const fresh = await createDraft({ sessionId: 's2', templateId: 'corporate-vertical', orientation: 'vertical' });

    await expireStaleDrafts(new Date(Date.now() - 1000 * 60 * 60 * 48));

    expect((await getDraftById(stale.id))?.status).toBe('expired');
    expect((await getDraftById(fresh.id))?.status).toBe('draft');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- drafts`
Expected: FAIL — `lib/db/drafts.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `lib/db/drafts.ts`:

```ts
import { and, eq, lt } from 'drizzle-orm';
import { db } from './client';
import { cardDrafts, type CardDraftRow } from './schema';
import type { CardDataPartialInput, StyleOverridesInput } from '@/lib/validation/card-schema';
import type { Orientation } from '@/lib/templates/types';

export async function createDraft(input: {
  sessionId: string;
  templateId: string;
  orientation: Orientation;
}): Promise<CardDraftRow> {
  const [row] = await db.insert(cardDrafts).values(input).returning();
  return row;
}

export async function getDraftById(id: string): Promise<CardDraftRow | null> {
  const [row] = await db.select().from(cardDrafts).where(eq(cardDrafts.id, id));
  return row ?? null;
}

export async function updateDraft(
  id: string,
  patch: CardDataPartialInput & { styleOverrides?: StyleOverridesInput }
): Promise<CardDraftRow | null> {
  const [row] = await db
    .update(cardDrafts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(cardDrafts.id, id))
    .returning();
  return row ?? null;
}

export async function submitDraft(id: string): Promise<CardDraftRow | null> {
  const [row] = await db
    .update(cardDrafts)
    .set({ status: 'submitted', updatedAt: new Date() })
    .where(eq(cardDrafts.id, id))
    .returning();
  return row ?? null;
}

export async function expireStaleDrafts(cutoff: Date): Promise<void> {
  await db
    .update(cardDrafts)
    .set({ status: 'expired' })
    .where(and(eq(cardDrafts.status, 'draft'), lt(cardDrafts.updatedAt, cutoff)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- drafts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/drafts.ts lib/db/drafts.test.ts
git commit -m "feat: add draft DB query helpers"
```

---

## Task 11: POST /api/drafts (Create Draft + Session Cookie)

**Files:**
- Create: `lib/session.ts`
- Create: `app/api/drafts/route.ts`
- Test: `lib/session.test.ts`
- Test: `app/api/drafts/route.test.ts`

**Interfaces:**
- Consumes: `createDraft` (Task 10); `getTemplate` (Task 4)
- Produces: `SESSION_COOKIE`, `SESSION_MAX_AGE`, `generateSessionId()`, `resolveSessionId(req)` (`lib/session.ts`) — consumed by Task 12-14; `POST /api/drafts` endpoint — consumed by Task 16 (gallery "select template" action).

- [ ] **Step 1: Write the failing session test**

Create `lib/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { resolveSessionId, SESSION_COOKIE, generateSessionId } from './session';

describe('generateSessionId', () => {
  it('generates a UUID-shaped string', () => {
    expect(generateSessionId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('resolveSessionId', () => {
  it('reuses an existing session cookie', () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      headers: { cookie: `${SESSION_COOKIE}=existing-id` },
    });
    const { sessionId, isNew } = resolveSessionId(req);
    expect(sessionId).toBe('existing-id');
    expect(isNew).toBe(false);
  });

  it('generates a new session id when no cookie is present', () => {
    const req = new NextRequest('http://localhost/api/drafts');
    const { sessionId, isNew } = resolveSessionId(req);
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(isNew).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- session`
Expected: FAIL — `lib/session.ts` does not exist.

- [ ] **Step 3: Write the session helper**

Create `lib/session.ts`:

```ts
import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'dbc_session';
export const SESSION_MAX_AGE = 60 * 60 * 48; // 48 hours, seconds

export function generateSessionId(): string {
  return randomUUID();
}

export function resolveSessionId(req: NextRequest): { sessionId: string; isNew: boolean } {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) return { sessionId: existing, isNew: false };
  return { sessionId: generateSessionId(), isNew: true };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- session`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing route test**

Create `app/api/drafts/route.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('POST /api/drafts', () => {
  it('creates a draft and sets a session cookie for a first-time visitor', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'corporate-vertical', orientation: 'vertical' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.templateId).toBe('corporate-vertical');
    expect(body.status).toBe('draft');
    expect(res.cookies.get('dbc_session')).toBeDefined();
  });

  it('reuses the existing session id and does not re-set the cookie', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'corporate-vertical', orientation: 'vertical' }),
      headers: { 'content-type': 'application/json', cookie: 'dbc_session=known-session' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(res.cookies.get('dbc_session')).toBeUndefined();
  });

  it('rejects an unknown template id', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'not-a-real-template', orientation: 'vertical' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- "api/drafts/route"`
Expected: FAIL — `app/api/drafts/route.ts` does not exist.

- [ ] **Step 7: Write the route**

Create `app/api/drafts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDraft } from '@/lib/db/drafts';
import { getTemplate } from '@/lib/templates/registry';
import { resolveSessionId, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

const createDraftSchema = z.object({
  templateId: z.string().min(1),
  orientation: z.enum(['vertical', 'horizontal']),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    getTemplate(parsed.data.templateId);
  } catch {
    return NextResponse.json({ error: `Unknown template: ${parsed.data.templateId}` }, { status: 400 });
  }

  const { sessionId, isNew } = resolveSessionId(req);
  const draft = await createDraft({ sessionId, ...parsed.data });

  const res = NextResponse.json(draft, { status: 201 });
  if (isNew) {
    res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
  }
  return res;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- "api/drafts/route"`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/session.ts lib/session.test.ts app/api/drafts/route.ts app/api/drafts/route.test.ts
git commit -m "feat: add POST /api/drafts with session cookie handling"
```

---

## Task 12: GET and PATCH /api/drafts/:id

**Files:**
- Create: `app/api/drafts/[id]/route.ts`
- Test: `app/api/drafts/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getDraftById`, `updateDraft` (Task 10); `cardDataPartialSchema`, `styleOverridesSchema` (Task 2); `resolveSessionId` (Task 11)
- Produces: `GET /api/drafts/:id`, `PATCH /api/drafts/:id` — consumed by Task 19 (`BuilderWizard` fetch-on-mount and debounced patch).

- [ ] **Step 1: Write the failing test**

Create `app/api/drafts/[id]/route.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('GET /api/drafts/:id', () => {
  it('returns the draft', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const res = await GET(new NextRequest('http://localhost'), { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(draft.id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/drafts/:id', () => {
  it('updates card fields', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Juan', email: 'juan@abc.com' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.firstName).toBe('Juan');
  });

  it('updates styleOverrides', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ styleOverrides: { accentColor: '#112233' } }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();
    expect(body.styleOverrides.accentColor).toBe('#112233');
  });

  it('rejects an invalid email', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- "api/drafts/\[id\]/route"`
Expected: FAIL — route does not exist.

- [ ] **Step 3: Write the route**

Create `app/api/drafts/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, updateDraft } from '@/lib/db/drafts';
import { cardDataPartialSchema, styleOverridesSchema } from '@/lib/validation/card-schema';
import { z } from 'zod';

const patchSchema = cardDataPartialSchema.extend({
  styleOverrides: styleOverridesSchema.optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(draft);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateDraft(id, parsed.data);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- "api/drafts/\[id\]/route"`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/api/drafts/[id]/route.ts" "app/api/drafts/[id]/route.test.ts"
git commit -m "feat: add GET and PATCH /api/drafts/:id"
```

---

## Task 13: Logo Upload

**Files:**
- Create: `lib/blob.ts`
- Create: `app/api/drafts/[id]/logo/route.ts`
- Test: `app/api/drafts/[id]/logo/route.test.ts`

**Interfaces:**
- Consumes: `updateDraft`, `getDraftById` (Task 10)
- Produces: `uploadLogo(file, draftId)` (`lib/blob.ts`); `POST /api/drafts/:id/logo` — consumed by Task 17 (`InfoForm` logo upload UI).

- [ ] **Step 1: Write the blob helper (thin wrapper, mockable in tests)**

Create `lib/blob.ts`:

```ts
import { put } from '@vercel/blob';

export async function uploadLogo(file: File, draftId: string): Promise<string> {
  const blob = await put(`logos/${draftId}-${Date.now()}-${file.name}`, file, {
    access: 'public',
  });
  return blob.url;
}
```

- [ ] **Step 2: Write the failing route test**

Create `app/api/drafts/[id]/logo/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft } from '@/lib/db/drafts';

vi.mock('@/lib/blob', () => ({
  uploadLogo: vi.fn().mockResolvedValue('https://blob.example.com/logos/fake.png'),
}));

import { POST } from './route';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('POST /api/drafts/:id/logo', () => {
  it('uploads a logo and stores its url on the draft', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const form = new FormData();
    form.set('file', new File(['fake-bytes'], 'logo.png', { type: 'image/png' }));

    const req = new NextRequest('http://localhost', { method: 'POST', body: form });
    const res = await POST(req, { params: Promise.resolve({ id: draft.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logoUrl).toBe('https://blob.example.com/logos/fake.png');
  });

  it('rejects a request with no file', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const req = new NextRequest('http://localhost', { method: 'POST', body: new FormData() });
    const res = await POST(req, { params: Promise.resolve({ id: draft.id }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown draft', async () => {
    const form = new FormData();
    form.set('file', new File(['fake-bytes'], 'logo.png', { type: 'image/png' }));
    const req = new NextRequest('http://localhost', { method: 'POST', body: form });
    const res = await POST(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- logo`
Expected: FAIL — route does not exist.

- [ ] **Step 4: Write the route**

Create `app/api/drafts/[id]/logo/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, updateDraft } from '@/lib/db/drafts';
import { uploadLogo } from '@/lib/blob';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const logoUrl = await uploadLogo(file, id);
  const updated = await updateDraft(id, { logoUrl });
  return NextResponse.json(updated);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- logo`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/blob.ts "app/api/drafts/[id]/logo/route.ts" "app/api/drafts/[id]/logo/route.test.ts"
git commit -m "feat: add logo upload endpoint"
```

---

## Task 14: POST /api/drafts/:id/submit

**Files:**
- Create: `app/api/drafts/[id]/submit/route.ts`
- Test: `app/api/drafts/[id]/submit/route.test.ts`

**Interfaces:**
- Consumes: `getDraftById`, `submitDraft` (Task 10); `cardDataSchema` (Task 2, full — not partial — validation)
- Produces: `POST /api/drafts/:id/submit` — consumed by Task 19 ("Continue / Get My Digital Card" button). This is the Builder's contract boundary with Commerce: on success it returns the finalized draft with `status: 'submitted'`; no Commerce order is created here.

- [ ] **Step 1: Write the failing test**

Create `app/api/drafts/[id]/submit/route.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft, updateDraft } from '@/lib/db/drafts';
import { POST } from './route';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('POST /api/drafts/:id/submit', () => {
  it('submits a draft with all required fields present', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await updateDraft(draft.id, {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      jobTitle: 'Sales Director',
      company: 'ABC Corporation',
      mobile: '+639171234567',
      email: 'juan@abc.com',
    });

    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('submitted');
  });

  it('rejects submission when a required field is missing', async () => {
    const draft = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: draft.id }),
    });
    expect(res.status).toBe(422);
  });

  it('returns 404 for an unknown draft', async () => {
    const res = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- submit`
Expected: FAIL — route does not exist.

- [ ] **Step 3: Write the route**

Create `app/api/drafts/[id]/submit/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, submitDraft } from '@/lib/db/drafts';
import { cardDataSchema } from '@/lib/validation/card-schema';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = cardDataSchema.safeParse(draft);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const submitted = await submitDraft(id);
  return NextResponse.json(submitted);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- submit`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "app/api/drafts/[id]/submit/route.ts" "app/api/drafts/[id]/submit/route.test.ts"
git commit -m "feat: add draft submission endpoint"
```

---

## Task 15: Draft Expiry Cron Route

**Files:**
- Create: `app/api/cron/expire-drafts/route.ts`
- Test: `app/api/cron/expire-drafts/route.test.ts`
- Modify: `vercel.json` (create if absent)

**Interfaces:**
- Consumes: `expireStaleDrafts` (Task 10)
- Produces: `GET /api/cron/expire-drafts` — invoked by Vercel Cron on a schedule; not consumed by any other task in this plan.

- [ ] **Step 1: Write the failing test**

Create `app/api/cron/expire-drafts/route.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { createDraft, getDraftById } from '@/lib/db/drafts';
import { eq } from 'drizzle-orm';
import { GET } from './route';

beforeEach(async () => {
  await db.delete(cardDrafts);
});

describe('GET /api/cron/expire-drafts', () => {
  it('expires drafts older than 48 hours and reports the count', async () => {
    const stale = await createDraft({ sessionId: 's1', templateId: 'corporate-vertical', orientation: 'vertical' });
    await db
      .update(cardDrafts)
      .set({ updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) })
      .where(eq(cardDrafts.id, stale.id));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expiredCount).toBe(1);
    expect((await getDraftById(stale.id))?.status).toBe('expired');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- expire-drafts`
Expected: FAIL — route does not exist.

- [ ] **Step 3: Write the route**

Create `app/api/cron/expire-drafts/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cardDrafts } from '@/lib/db/schema';
import { expireStaleDrafts } from '@/lib/db/drafts';

const FORTY_EIGHT_HOURS_MS = 1000 * 60 * 60 * 48;

export async function GET() {
  const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);
  const staleRows = await db
    .select({ id: cardDrafts.id })
    .from(cardDrafts)
    .where(and(eq(cardDrafts.status, 'draft'), lt(cardDrafts.updatedAt, cutoff)));

  await expireStaleDrafts(cutoff);

  return NextResponse.json({ expiredCount: staleRows.length });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- expire-drafts`
Expected: PASS (1 test)

- [ ] **Step 5: Wire up the cron schedule**

Create (or extend) `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/expire-drafts", "schedule": "0 * * * *" }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add "app/api/cron/expire-drafts/route.ts" "app/api/cron/expire-drafts/route.test.ts" vercel.json
git commit -m "feat: add hourly draft expiry cron job"
```

---

## Task 16: Template Gallery Component and /templates Page

**Files:**
- Create: `components/builder/TemplateGallery.tsx`
- Create: `app/templates/page.tsx`
- Test: `components/builder/TemplateGallery.test.tsx`

**Interfaces:**
- Consumes: `listTemplates` (Task 4); `POST /api/drafts` (Task 11)
- Produces: `TemplateGallery` component (`onSelect(templateId, orientation) => void` prop) — consumed by `app/templates/page.tsx`, which performs the actual `fetch('/api/drafts', ...)` + navigation, keeping `TemplateGallery` itself free of routing/data-fetching concerns.

- [ ] **Step 1: Write the failing test**

Create `components/builder/TemplateGallery.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateGallery } from './TemplateGallery';

describe('TemplateGallery', () => {
  it('lists all 10 templates by default', () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(10);
  });

  it('filters by orientation', async () => {
    render(<TemplateGallery onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /horizontal/i }));
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(4);
  });

  it('calls onSelect with the template id and orientation', async () => {
    const onSelect = vi.fn();
    render(<TemplateGallery onSelect={onSelect} />);
    const firstSelect = screen.getAllByRole('button', { name: /select/i })[0];
    await userEvent.click(firstSelect);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/vertical|horizontal/));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- TemplateGallery`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the component**

Create `components/builder/TemplateGallery.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { listTemplates } from '@/lib/templates/registry';
import type { Orientation } from '@/lib/templates/types';

interface TemplateGalleryProps {
  onSelect: (templateId: string, orientation: Orientation) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const [orientationFilter, setOrientationFilter] = useState<Orientation | undefined>(undefined);
  const templates = listTemplates(orientationFilter ? { orientation: orientationFilter } : undefined);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setOrientationFilter(undefined)}>All</button>
        <button onClick={() => setOrientationFilter('vertical')}>Vertical</button>
        <button onClick={() => setOrientationFilter('horizontal')}>Horizontal</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="border rounded-lg p-4">
            <p className="font-medium">{t.name}</p>
            <p className="text-sm text-gray-500 capitalize">
              {t.category} · {t.orientation}
            </p>
            <button
              className="mt-2 px-3 py-1 bg-black text-white rounded"
              onClick={() => onSelect(t.id, t.orientation)}
            >
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- TemplateGallery`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire up the page**

Create `app/templates/page.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { TemplateGallery } from '@/components/builder/TemplateGallery';

export default function TemplatesPage() {
  const router = useRouter();

  async function handleSelect(templateId: string, orientation: string) {
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId, orientation }),
    });
    const draft = await res.json();
    router.push(`/builder/${draft.id}`);
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Choose a template</h1>
      <TemplateGallery onSelect={handleSelect} />
    </main>
  );
}
```

- [ ] **Step 6: Manual smoke check**

Run: `npm run dev`, visit `http://localhost:3000/templates`, click "Select" on any template, confirm the browser navigates to `/builder/<uuid>` (the page itself is built in Task 19; a 404 there is expected for now).

- [ ] **Step 7: Commit**

```bash
git add components/builder/TemplateGallery.tsx components/builder/TemplateGallery.test.tsx app/templates/page.tsx
git commit -m "feat: add template gallery and /templates page"
```

---

## Task 17: InfoForm Component (Fields, Validation, Logo Upload)

**Files:**
- Create: `components/builder/InfoForm.tsx`
- Test: `components/builder/InfoForm.test.tsx`

**Interfaces:**
- Consumes: `CardData` (Task 2); `cardDataPartialSchema` (Task 2, for client-side inline validation)
- Produces: `InfoForm` component with props `{ data: Partial<CardData>; onChange: (patch: Partial<CardData>) => void; onLogoUpload: (file: File) => void }` — consumed by Task 19 (`BuilderWizard`).

- [ ] **Step 1: Write the failing test**

Create `components/builder/InfoForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoForm } from './InfoForm';

describe('InfoForm', () => {
  it('renders all required and optional fields', () => {
    render(<InfoForm data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    for (const label of ['First name', 'Last name', 'Job title', 'Company', 'Mobile number', 'Email']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const label of ['Website', 'Address', 'LinkedIn', 'Facebook', 'Instagram', 'WhatsApp', 'Messenger']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('calls onChange with a field patch when a field is edited', async () => {
    const onChange = vi.fn();
    render(<InfoForm data={{}} onChange={onChange} onLogoUpload={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('First name'), 'J');
    expect(onChange).toHaveBeenCalledWith({ firstName: 'J' });
  });

  it('shows an inline error for an invalid email', async () => {
    render(<InfoForm data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'not-an-email');
    fireEvent.blur(emailInput);
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('calls onLogoUpload when a logo file is chosen', async () => {
    const onLogoUpload = vi.fn();
    render(<InfoForm data={{}} onChange={vi.fn()} onLogoUpload={onLogoUpload} />);
    const file = new File(['bytes'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Company logo'), file);
    expect(onLogoUpload).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- InfoForm`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the component**

Create `components/builder/InfoForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { cardDataPartialSchema } from '@/lib/validation/card-schema';
import type { CardData } from '@/lib/templates/types';

interface InfoFormProps {
  data: Partial<CardData>;
  onChange: (patch: Partial<CardData>) => void;
  onLogoUpload: (file: File) => void;
}

const FIELD_ERRORS: Record<string, string> = {
  email: 'Please enter a valid email address.',
  website: 'Please enter a valid URL.',
  facebook: 'Please enter a valid URL.',
  linkedin: 'Please enter a valid URL.',
  instagram: 'Please enter a valid URL.',
  messenger: 'Please enter a valid URL.',
};

export function InfoForm({ data, onChange, onLogoUpload }: InfoFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function field(name: keyof CardData) {
    return {
      value: data[name] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [name]: e.target.value }),
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const result = cardDataPartialSchema.pick({ [name]: true } as any).safeParse({ [name]: e.target.value || undefined });
        setErrors(prev => ({ ...prev, [name]: result.success ? '' : FIELD_ERRORS[name] ?? 'Invalid value.' }));
      },
    };
  }

  return (
    <form className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="font-semibold">Required</legend>
        <label>First name<input aria-label="First name" {...field('firstName')} /></label>
        <label>Last name<input aria-label="Last name" {...field('lastName')} /></label>
        <label>Job title<input aria-label="Job title" {...field('jobTitle')} /></label>
        <label>Company<input aria-label="Company" {...field('company')} /></label>
        <label>Mobile number<input aria-label="Mobile number" {...field('mobile')} /></label>
        <label>
          Email
          <input aria-label="Email" {...field('email')} />
          {errors.email && <span role="alert">{errors.email}</span>}
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold">Optional</legend>
        <label>Address<input aria-label="Address" {...field('address')} /></label>
        <label>
          Website
          <input aria-label="Website" {...field('website')} />
          {errors.website && <span role="alert">{errors.website}</span>}
        </label>
        <label>
          Company logo
          <input
            aria-label="Company logo"
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onLogoUpload(file);
            }}
          />
        </label>
        <label>Facebook<input aria-label="Facebook" {...field('facebook')} /></label>
        <label>LinkedIn<input aria-label="LinkedIn" {...field('linkedin')} /></label>
        <label>Instagram<input aria-label="Instagram" {...field('instagram')} /></label>
        <label>WhatsApp<input aria-label="WhatsApp" {...field('whatsapp')} /></label>
        <label>Messenger<input aria-label="Messenger" {...field('messenger')} /></label>
      </fieldset>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- InfoForm`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/builder/InfoForm.tsx components/builder/InfoForm.test.tsx
git commit -m "feat: add InfoForm with inline validation and logo upload"
```

---

## Task 18: CustomizePanel Component

**Files:**
- Create: `components/builder/CustomizePanel.tsx`
- Test: `components/builder/CustomizePanel.test.tsx`

**Interfaces:**
- Consumes: `TemplateDefinition`, `StyleOverrides` (Task 2/4)
- Produces: `CustomizePanel` component with props `{ template: TemplateDefinition; style: StyleOverrides; onChange: (patch: Partial<StyleOverrides>) => void }` — consumed by Task 19 (`BuilderWizard`).

- [ ] **Step 1: Write the failing test**

Create `components/builder/CustomizePanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomizePanel } from './CustomizePanel';
import type { TemplateDefinition } from '@/lib/templates/types';

const template: TemplateDefinition = {
  id: 'corporate-vertical',
  name: 'Corporate',
  category: 'corporate',
  orientation: 'vertical',
  customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
  component: () => null,
};

describe('CustomizePanel', () => {
  it('shows an accent color picker when the template allows it', () => {
    render(<CustomizePanel template={template} style={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/accent color/i)).toBeInTheDocument();
  });

  it('hides the accent color picker when the template disallows it', () => {
    render(
      <CustomizePanel
        template={{ ...template, customizable: { ...template.customizable, accentColor: false } }}
        style={{}}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/accent color/i)).not.toBeInTheDocument();
  });

  it('clamps the font size stepper to the template bounds', () => {
    render(<CustomizePanel template={template} style={{ fontSizeStep: -1 }} onChange={vi.fn()} />);
    const input = screen.getByLabelText(/font size/i) as HTMLInputElement;
    expect(input.min).toBe('-1');
    expect(input.max).toBe('1');
  });

  it('calls onChange when the accent color changes', async () => {
    const onChange = vi.fn();
    render(<CustomizePanel template={template} style={{}} onChange={onChange} />);
    fireEvent_change(screen.getByLabelText(/accent color/i), '#123456');
    expect(onChange).toHaveBeenCalledWith({ accentColor: '#123456' });
  });
});

function fireEvent_change(el: HTMLElement, value: string) {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- CustomizePanel`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the component**

Create `components/builder/CustomizePanel.tsx`:

```tsx
'use client';

import type { TemplateDefinition, StyleOverrides } from '@/lib/templates/types';

interface CustomizePanelProps {
  template: TemplateDefinition;
  style: StyleOverrides;
  onChange: (patch: Partial<StyleOverrides>) => void;
}

export function CustomizePanel({ template, style, onChange }: CustomizePanelProps) {
  return (
    <div className="space-y-4">
      {template.customizable.accentColor && (
        <label>
          Accent color
          <input
            aria-label="Accent color"
            type="color"
            value={style.accentColor ?? '#000000'}
            onChange={e => onChange({ accentColor: e.target.value })}
          />
        </label>
      )}
      {template.customizable.fontSizeStep && (
        <label>
          Font size
          <input
            aria-label="Font size"
            type="range"
            min={template.customizable.fontSizeStep.min}
            max={template.customizable.fontSizeStep.max}
            value={style.fontSizeStep ?? 0}
            onChange={e => onChange({ fontSizeStep: Number(e.target.value) })}
          />
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- CustomizePanel`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/builder/CustomizePanel.tsx components/builder/CustomizePanel.test.tsx
git commit -m "feat: add CustomizePanel bounded by template customization rules"
```

---

## Task 19: BuilderWizard, LivePreview, and the /builder/[draftId] Pages

**Files:**
- Create: `components/builder/PhoneFrame.tsx`
- Create: `components/builder/LivePreview.tsx`
- Create: `components/builder/BuilderWizard.tsx`
- Create: `app/builder/[draftId]/page.tsx`
- Create: `app/builder/[draftId]/submitted/page.tsx`
- Test: `components/builder/BuilderWizard.test.tsx`

**Interfaces:**
- Consumes: `TemplateGallery` output is not used here (gallery already created the draft); `InfoForm` (Task 17), `CustomizePanel` (Task 18), `getTemplate` (Task 4), `GET/PATCH /api/drafts/:id` (Task 12), `POST /api/drafts/:id/submit` (Task 14)
- Produces: fully wired builder page — this is the last task before E2E (Task 20).

- [ ] **Step 1: Write PhoneFrame and LivePreview (no test — trivial presentational wrappers, covered by BuilderWizard's test)**

Create `components/builder/PhoneFrame.tsx`:

```tsx
import type { Orientation } from '@/lib/templates/types';

export function PhoneFrame({ orientation, children }: { orientation: Orientation; children: React.ReactNode }) {
  return (
    <div
      className={`mx-auto rounded-[2rem] border-8 border-gray-800 bg-gray-800 p-2 ${
        orientation === 'vertical' ? 'w-[360px]' : 'w-[600px]'
      }`}
    >
      <div className="bg-white rounded-[1.5rem] overflow-hidden flex items-center justify-center p-4">{children}</div>
    </div>
  );
}
```

Create `components/builder/LivePreview.tsx`:

```tsx
import { getTemplate } from '@/lib/templates/registry';
import { PhoneFrame } from './PhoneFrame';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

export function LivePreview({
  templateId,
  data,
  style,
}: {
  templateId: string;
  data: Partial<CardData>;
  style: StyleOverrides;
}) {
  const template = getTemplate(templateId);
  const Component = template.component;
  const previewData: CardData = {
    firstName: data.firstName || 'First Name',
    lastName: data.lastName || 'Last Name',
    jobTitle: data.jobTitle || 'Job Title',
    company: data.company || 'Company',
    mobile: data.mobile || '+63 900 000 0000',
    email: data.email || 'you@example.com',
    ...data,
  };

  return (
    <PhoneFrame orientation={template.orientation}>
      <Component data={previewData} style={style} />
    </PhoneFrame>
  );
}
```

- [ ] **Step 2: Write the failing BuilderWizard test**

Create `components/builder/BuilderWizard.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { BuilderWizard } from './BuilderWizard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const draft = {
  id: 'draft-1',
  templateId: 'corporate-vertical',
  orientation: 'vertical',
  status: 'draft',
  firstName: '',
  styleOverrides: {},
};

const server = setupServer(
  http.get('/api/drafts/draft-1', () => HttpResponse.json(draft)),
  http.patch('/api/drafts/draft-1', async ({ request }) => {
    const patch = await request.json();
    return HttpResponse.json({ ...draft, ...patch });
  }),
  http.post('/api/drafts/draft-1/submit', () => HttpResponse.json({ ...draft, status: 'submitted' }))
);

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());

describe('BuilderWizard', () => {
  it('loads the draft and renders the live preview', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => expect(screen.getByText(/Job Title/)).toBeInTheDocument());
  });

  it('patches the draft when a field changes', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'Juan');
    await waitFor(() => expect(screen.getByText('Juan Last Name')).toBeInTheDocument());
  });

  it('submits the draft and shows a confirmation state', async () => {
    render(<BuilderWizard draftId="draft-1" />);
    await waitFor(() => screen.getByRole('button', { name: /continue/i }));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByText(/submitted/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- BuilderWizard`
Expected: FAIL — component does not exist.

- [ ] **Step 4: Write the component**

Create `components/builder/BuilderWizard.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoForm } from './InfoForm';
import { CustomizePanel } from './CustomizePanel';
import { LivePreview } from './LivePreview';
import { getTemplate } from '@/lib/templates/registry';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

interface DraftState {
  id: string;
  templateId: string;
  status: string;
  styleOverrides: StyleOverrides;
  [key: string]: unknown;
}

export function BuilderWizard({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState | null>(null);

  useEffect(() => {
    fetch(`/api/drafts/${draftId}`)
      .then(r => r.json())
      .then(setDraft);
  }, [draftId]);

  if (!draft) return <p>Loading…</p>;
  if (draft.status === 'submitted') return <p>Your card has been submitted.</p>;

  const template = getTemplate(draft.templateId);
  const data = draft as unknown as Partial<CardData>;

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setDraft(await res.json());
  }

  async function handleLogoUpload(file: File) {
    const form = new FormData();
    form.set('file', file);
    const res = await fetch(`/api/drafts/${draftId}/logo`, { method: 'POST', body: form });
    setDraft(await res.json());
  }

  async function handleSubmit() {
    const res = await fetch(`/api/drafts/${draftId}/submit`, { method: 'POST' });
    setDraft(await res.json());
    router.push(`/builder/${draftId}/submitted`);
  }

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-8">
        <InfoForm data={data} onChange={patch} onLogoUpload={handleLogoUpload} />
        <CustomizePanel
          template={template}
          style={draft.styleOverrides}
          onChange={patch2 => patch({ styleOverrides: { ...draft.styleOverrides, ...patch2 } })}
        />
        <button onClick={handleSubmit}>Continue / Get My Digital Card</button>
      </div>
      <LivePreview templateId={draft.templateId} data={data} style={draft.styleOverrides} />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- BuilderWizard`
Expected: PASS (3 tests)

- [ ] **Step 6: Wire up the pages**

Create `app/builder/[draftId]/page.tsx`:

```tsx
import { BuilderWizard } from '@/components/builder/BuilderWizard';

export default async function BuilderPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <main className="max-w-6xl mx-auto p-8">
      <BuilderWizard draftId={draftId} />
    </main>
  );
}
```

Create `app/builder/[draftId]/submitted/page.tsx`:

```tsx
export default function SubmittedPage() {
  return (
    <main className="max-w-2xl mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Thanks — your card is ready for checkout.</h1>
      <p>Payment and provisioning happen in the next step (coming soon).</p>
    </main>
  );
}
```

`BuilderWizard.tsx` already redirects to this page from `handleSubmit` (Step 4).

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev`, go through `/templates` → select a template → fill required fields → adjust accent color → confirm the preview updates live → click "Continue / Get My Digital Card" → confirm redirect to `/builder/<id>/submitted`.

- [ ] **Step 8: Commit**

```bash
git add components/builder/PhoneFrame.tsx components/builder/LivePreview.tsx components/builder/BuilderWizard.tsx \
  components/builder/BuilderWizard.test.tsx "app/builder/[draftId]/page.tsx" "app/builder/[draftId]/submitted/page.tsx"
git commit -m "feat: wire up BuilderWizard, live preview, and builder pages"
```

---

## Task 20: End-to-End Happy Path

**Files:**
- Create: `tests/e2e/builder-happy-path.spec.ts`

**Interfaces:**
- Consumes: the full running app (Tasks 1-19)
- Produces: nothing consumed elsewhere — this is the plan's final verification.

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/builder-happy-path.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('select template, fill form, customize, preview, submit', async ({ page }) => {
  await page.goto('/templates');
  await page.getByRole('button', { name: 'Select' }).first().click();

  await page.waitForURL(/\/builder\/.+/);

  await page.getByLabel('First name').fill('Juan');
  await page.getByLabel('Last name').fill('Dela Cruz');
  await page.getByLabel('Job title').fill('Sales Director');
  await page.getByLabel('Company').fill('ABC Corporation');
  await page.getByLabel('Mobile number').fill('+639171234567');
  await page.getByLabel('Email').fill('juan@abc.com');

  await expect(page.getByText('Juan Dela Cruz')).toBeVisible();

  await page.getByLabel('Accent color').fill('#ff5500');

  await page.getByRole('button', { name: /continue/i }).click();

  await page.waitForURL(/\/submitted$/);
  await expect(page.getByText(/ready for checkout/i)).toBeVisible();
});
```

- [ ] **Step 2: Ensure the dev DB is migrated and run the E2E test**

Run:

```bash
npm run db:push
npm run test:e2e
```

Expected: PASS (1 test). If it fails on the template-select step, verify `.env.local`'s `DATABASE_URL` points at a running Postgres with the `card_drafts` table present (Task 3).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/builder-happy-path.spec.ts
git commit -m "test: add end-to-end happy path for the Builder flow"
```

---

## Plan Complete

At this point the DBC Builder is a working, independently testable Next.js app: a visitor can browse 10 templates, build a card with live preview, upload a logo, customize within template bounds, and submit — producing a `submitted` draft ready for the Commerce sub-project to pick up. Commerce, Provisioning/PWA Holder, and Exchange are separate plans, each starting from its own brainstorming → spec → plan cycle.
