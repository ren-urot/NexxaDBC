# DBC Builder — Design Spec

Status: Approved
Date: 2026-08-21
Sub-project 1 of 4 (Builder → Commerce → Provisioning/PWA Holder → Exchange), per PRD "Digital Business Card + DBC Holder" v2.0.

## Scope

This sub-project covers the web-based card **Builder** only: template selection,
information entry, customization, live preview, and handoff to Commerce via a
"Continue / Get My Digital Card" action.

Out of scope (future sub-projects):
- Payment, order management, admin verification dashboard ("Commerce")
- Provisioning QR generation/consumption, the standalone PWA Holder ("Provisioning + PWA Holder")
- Card-to-card exchange protocol ("Exchange")

The Builder's job ends at producing a finished, order-ready card payload
(`CardDraft` with `status = submitted`). Everything after that belongs to
Commerce.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Postgres for draft storage (Vercel Postgres or Neon)
- Vercel Blob (or equivalent object storage) for logo uploads
- Deploy target: Vercel

## Data Model

### `CardDraft`

| Field | Notes |
|---|---|
| `id` | primary key |
| `session_id` | signed cookie value, no login required |
| `template_id` | FK to template registry (code, not DB-driven) |
| `orientation` | `vertical` \| `horizontal` |
| `status` | `draft` \| `submitted` \| `expired` |
| `first_name`, `last_name`, `job_title`, `company`, `mobile`, `email` | required fields |
| `address`, `website`, `logo_url`, `facebook`, `linkedin`, `instagram`, `whatsapp`, `messenger` | optional fields |
| `style_overrides` | JSON: accent color, font size step, etc. — bounded per-template |
| `created_at`, `updated_at` | timestamps |

**Retention:** drafts are soft-deleted after 48h of inactivity (no server-side
accumulation of abandoned sessions). Once a draft is submitted, ownership
passes to Commerce, whose own retention rule (delete after successful phone
provisioning) is defined in that sub-project's spec — consistent with the
product's one-time, no-permanent-storage model.

**Logo uploads:** stored in Blob keyed to the draft id. Deleted when the
draft expires, or later by Commerce/Provisioning after successful transfer.

## Templates

10 hand-coded React components (not JSON/config-driven — prioritizes design
quality over runtime flexibility for a fixed MVP set), spanning both vertical
and horizontal orientations, distributed across the PRD's categories
(Corporate, Professional, Modern, Minimal, Executive, Creative — exact
per-category split decided during implementation).

Each template component:
- Accepts the same `CardData` prop shape (the fields above)
- Internally declares which fields are customizable and their bounds (e.g.
  accent color: freely settable; font family: fixed; font size: ±2 steps
  from default)
- Enforces "customization within a template," not a free-form design editor,
  per PRD §7

## Builder Flow

1. **Template gallery** — browse/filter by orientation and category
2. **Info form** — required + optional fields, inline validation
3. **Customize panel** — only the fields the chosen template exposes
4. **Live preview** — phone-frame mockup rendered by the same template
   component used for final output (no separate render pipeline — preview
   accuracy is guaranteed by construction)
5. **Continue / Get My Digital Card** — marks the draft `submitted`, creates
   the Commerce order, redirects to payment (Commerce sub-project)

## API Surface (Builder only)

- `POST /api/drafts` — create draft (template + orientation selection)
- `PATCH /api/drafts/:id` — update fields / customization
- `POST /api/drafts/:id/logo` — upload logo
- `GET /api/drafts/:id` — fetch draft for preview rendering
- `POST /api/drafts/:id/submit` — finalize; hands off to Commerce (contract
  only — Commerce's own endpoints are out of scope here)

## Testing

- Component tests per template: renders valid output for min/max field
  lengths and missing optional fields
- One Playwright E2E happy path: select template → fill form → customize →
  preview → submit
