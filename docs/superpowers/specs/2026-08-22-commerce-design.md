# Commerce — Design Spec

Status: Approved
Date: 2026-08-22
Sub-project 2 of 4 (Builder → **Commerce** → Provisioning/PWA Holder → Exchange), per PRD "Digital Business Card + DBC Holder" v2.0.

## Scope

This sub-project covers **Commerce**: the checkout flow that turns a Builder-submitted draft into a paid order, manual payment verification, and an admin dashboard — ending at generating a **provisioning QR**.

Out of scope (future sub-projects):
- What the provisioning QR's URL actually does when visited (initializing the standalone DBC Holder) — "Provisioning + PWA Holder" sub-project.
- Card-to-card exchange — "Exchange" sub-project.

Commerce's job ends at: order reaches `approved`, a provisioning token + QR exist for it. It does not build the page the QR points to.

## Architecture

Extends the existing Next.js app (same repo, same Postgres DB) rather than a separate service — Commerce is tightly coupled to Builder (checkout immediately follows submit) and this is a small MVP; service separation would add deployment/auth complexity with no present benefit.

New dependency: `qrcode.react` — client-side QR rendering (SVG/canvas, no server image pipeline needed) for both the static demo payment QRs and the dynamic provisioning QR.

## Data Model

### `orders`

| Field | Notes |
|---|---|
| `id` | uuid, primary key |
| `draftId` | FK → `card_drafts.id`. The draft is frozen (PATCH/submit blocked by its own status guard) once `submitted`, so it's safe to reference by id rather than snapshot. |
| `sessionId` | denormalized from the draft's session, same ownership pattern as `card_drafts` — an order-scoped `loadOwnedOrder` helper mirrors Builder's `loadOwnedDraft`. |
| `status` | enum: `pending_payment` \| `submitted` \| `approved` \| `rejected` \| `provisioned` |
| `amount` | integer, whole pesos (499). Single fixed price, no currency field needed for this MVP. |
| `paymentMethod` | enum: `gcash` \| `bank_transfer`, nullable until the customer picks one |
| `paymentReference` | varchar, nullable |
| `paymentProofUrl` | text (Vercel Blob URL), nullable |
| `adminNotes` | text, nullable — shown to the customer on rejection |
| `provisioningToken` | varchar, nullable, unique — set on approval |
| `provisioningTokenStatus` | enum: `active` \| `expired` \| `consumed`, nullable |
| `provisioningExpiresAt` | timestamp, nullable |
| `createdAt`, `updatedAt` | timestamps |

**Status simplification:** the PRD lists "Payment Submitted" and "Under Verification" as distinct statuses. Collapsed into one `submitted` status here — once proof is uploaded it's awaiting admin review either way; a separate persisted state for that transition doesn't earn its keep for an MVP with no queueing/SLA logic.

**Provisioning token:** denormalized onto `orders` rather than a separate table — one order has at most one active token at a time (admin "regenerate" replaces it, "expire" nulls its active-ness), so a join table's history-tracking capability isn't needed yet.

**Retention:** deleting the order/draft/payment-proof blob after successful provisioning is explicitly the *next* sub-project's responsibility (it owns the moment "provisioned" actually becomes true, when a Holder consumes the token) — Commerce does not implement deletion.

## Checkout Flow

1. Builder's `/builder/[draftId]/submitted` page gets a real "Continue to payment" action (replacing today's "coming soon" placeholder) → `POST /api/orders` creates an order (`status: pending_payment`, `amount: 499`) from the submitted draft → redirects to `/checkout/[orderId]`.
2. `/checkout/[orderId]`: select GCash or Bank Transfer → shows that method's QR (static demo payment info, rendered via `qrcode.react`) → a form for payment reference + proof screenshot upload (reusing the Blob upload pattern from Builder's logo upload) → `POST /api/orders/[id]/payment` sets `paymentMethod`/`paymentReference`/`paymentProofUrl`, moves `status` to `submitted`.
3. `/checkout/[orderId]/status` — the durable, bookmarkable link the customer returns to. Shows current status, admin notes on rejection, and (once `approved`) the provisioning QR.
4. On `rejected`, the customer can resubmit payment info from the status page, moving the order back to `submitted`.

Order ownership follows the same `dbc_session` cookie pattern as drafts — `loadOwnedOrder(req, id)` in `lib/order-access.ts`, mirroring `lib/draft-access.ts`.

## Admin Dashboard

Password-gated: a single shared password via `ADMIN_PASSWORD` env var, no user accounts/roles. `POST /api/admin/login` checks the password and sets an HMAC-signed cookie (`lib/admin-auth.ts`, keyed by `ADMIN_SESSION_SECRET`) — no sessions table needed since there's exactly one admin identity. `middleware.ts` guards `/admin/*` (except `/admin/login`) and the `/api/admin/*` routes.

- `/admin/orders` — list, filterable by status
- `/admin/orders/[id]` — detail: customer's card data (from the linked draft), payment method/reference, proof image, admin-notes field, Approve/Reject actions
- Approve → generates `provisioningToken` (random, unguessable — `crypto.randomBytes(32).toString('hex')`), sets `provisioningTokenStatus: active`, `provisioningExpiresAt` (30 days out), `status: approved`
- Reject → requires a note, sets `status: rejected`
- Regenerate QR → replaces `provisioningToken`, resets expiry
- Expire QR → sets `provisioningTokenStatus: expired`

The provisioning QR encodes `{origin}/provision/{token}` — a URL. What that page does belongs to the next sub-project; Commerce only generates and displays it.

## API Surface (Commerce only)

- `POST /api/orders` — create order from a submitted draft
- `GET /api/orders/[id]` — fetch order (ownership-checked)
- `POST /api/orders/[id]/payment` — submit method/reference/proof
- `POST /api/admin/login` — admin auth
- `GET /api/admin/orders` — list (admin-only)
- `GET /api/admin/orders/[id]` — detail (admin-only)
- `POST /api/admin/orders/[id]/approve` — approve + generate token
- `POST /api/admin/orders/[id]/reject` — reject with notes
- `POST /api/admin/orders/[id]/provisioning-qr/regenerate` — replace token
- `POST /api/admin/orders/[id]/provisioning-qr/expire` — expire token

## Testing

- Component tests per new component (payment method selector, QR display, admin order table row)
- API route tests against the live test DB, same pattern as Builder (ownership guards, status-transition guards)
- One Playwright E2E: submit a draft → checkout → select GCash → submit reference + proof → status shows "under review" → admin logs in, approves → status page shows the provisioning QR
