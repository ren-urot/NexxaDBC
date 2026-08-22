# Provisioning + PWA Holder — Design Spec

Status: Approved
Date: 2026-08-23
Sub-project 3 of 4 (Builder → Commerce → **Provisioning/PWA Holder** → Exchange), per PRD "Digital Business Card + DBC Holder" v2.0.

## Scope

This sub-project covers what happens when the provisioning QR from Commerce is scanned: transferring the card onto the customer's phone, and the standalone DBC Holder PWA that displays, saves, and shares it from then on.

Out of scope (future sub-project):
- Card-to-card exchange (receiving someone else's card into the Holder) — "Exchange" sub-project.
- Editing a card after it's been provisioned.

Provisioning's job ends at: the card is saved on the customer's device and viewable in the Holder. It does not touch anything about how one Holder shares its card with another Holder.

## Architecture — standalone transfer, no server dependency

The defining constraint of this sub-project, set explicitly by the product owner: once a card is on the customer's phone, *nothing* about using it may depend on this app's database or servers — matches the physical-business-card metaphor (a printed card doesn't phone home to work). This reaches back into how the QR itself is generated:

**The QR encodes the card data directly, not a lookup token.** Commerce (already merged) currently generates a random `provisioningToken`, stores it in the `orders` table, and encodes `{origin}/provision/{token}` — a URL the Holder would look up server-side. This sub-project replaces that: the QR instead encodes `{origin}/holder/install#<compact-encoded-card>`, where the card's fields (name, title, company, contact info, template choice) are embedded directly in a URL **fragment**. A fragment is never sent in the HTTP request line, so visiting this URL involves zero server contact for the payload itself — only the static page shell loads over the network (and that becomes cacheable/offline after a first visit, via the Holder's service worker).

**Consequence: no server-side revocation.** A self-contained QR can't be invalidated once it exists — screenshotting or forwarding it produces a working copy forever, the same way a photographed physical business card can't be un-shared. This is an accepted tradeoff (confirmed with the product owner), not an oversight.

**Consequence: the server can never confirm an install happened.** There is no callback, ping, or "consumed" event — matches "no need to keep record." `approved` becomes the terminal order status this sub-project ever sets; the `provisioned` status Commerce's schema reserved is never reached and is left defined-but-unused (removing a Postgres enum value is unnecessarily risky for a status nothing else references).

**This reopens already-merged Commerce code.** Concretely:
- `app/api/admin/orders/[id]/approve/route.ts` stops generating a token — approval only flips `status: approved`.
- `components/checkout/OrderStatus.tsx` and the admin order-detail page (`app/admin/orders/[id]/page.tsx`, replacing `components/admin/ProvisioningQR.tsx`) compute the QR's value client-side from order + draft fields already being fetched, instead of using a stored token.
- `GET /api/orders/[id]` (the customer-facing route) currently returns only the bare order row — it needs the linked draft's card fields added (mirroring what the admin detail route already does) so the customer's status page can build the same self-contained QR the admin sees.
- The "Regenerate QR" and "Expire QR" admin actions and their routes (`.../provisioning-qr/regenerate`, `.../provisioning-qr/expire`) are removed — there's no server-side token left to regenerate or expire. (The card's own content is frozen after Builder submission regardless — Builder never allowed post-submission edits — so there's no scenario where the QR's content needs refreshing.)
- A migration drops `orders.provisioningToken`, `provisioningTokenStatus`, `provisioningExpiresAt` — unused once nothing writes or reads them.

New code stays inside the same Next.js app (same repo, same Postgres DB for the parts that still need it — the DB constraint is specifically about the *transfer*, not about Commerce's existing checkout/admin bookkeeping), consistent with Builder and Commerce.

## Card Payload Encoding

A versioned, compact JSON object, short keys to keep the QR small and reliably scannable, base64url-encoded into the URL fragment. Covers every field the template components actually render (`lib/templates/types.ts`'s `CardData` and `StyleOverrides`) — an earlier draft of this table only carried the required fields and missed the optional contact/social/style ones; corrected here before planning:

| Key | Meaning | Source | Required? |
|---|---|---|---|
| `v` | schema version (`1`) | literal | yes |
| `fn` | first name | `draft.firstName` | yes |
| `ln` | last name | `draft.lastName` | yes |
| `jt` | job title | `draft.jobTitle` | yes |
| `co` | company | `draft.company` | yes |
| `mo` | mobile | `draft.mobile` | yes |
| `em` | email | `draft.email` | yes |
| `tp` | template id | `draft.templateId` | yes |
| `or` | orientation (`vertical` \| `horizontal`) | `draft.orientation` | yes |
| `ad` | address | `draft.address` | no |
| `ws` | website | `draft.website` | no |
| `lg` | logo URL | `draft.logoUrl` | no |
| `fb` | Facebook | `draft.facebook` | no |
| `li` | LinkedIn | `draft.linkedin` | no |
| `ig` | Instagram | `draft.instagram` | no |
| `wa` | WhatsApp | `draft.whatsapp` | no |
| `ms` | Messenger | `draft.messenger` | no |
| `ac` | accent color override | `draft.styleOverrides.accentColor` | no |
| `fs` | font-size-step override | `draft.styleOverrides.fontSizeStep` | no |

A logo's image bytes are never embedded (far too large for a reliably-scannable QR) — only its URL travels in the payload, fetched once by the Holder like any other image and cached locally afterward. This is the one narrow exception to "zero network calls": loading a static image resource, not a database lookup.

**Compression is required, not optional.** A worst-case card — every optional field present at Builder's own maximum lengths (500-char address, six ~255-char social/website URLs) — produces roughly 4,000 base64url characters, which exceeds a QR code's maximum capacity at *any* error-correction level (~2,953 bytes even at the most permissive setting). This isn't a rare edge case to accept the risk of; it needs an actual fix. The payload is compressed with `lz-string` (a small, ~4KB dependency, the standard choice for exactly this "cram structured data into a QR-sized string" problem) before base64url encoding, and decompressed on the way back out. No field is truncated or dropped — every value, including all social URLs, survives at full length; typical cards also end up with a smaller, easier-to-scan QR as a side effect.

Decoding validates: well-formed base64url, well-formed JSON, `v` matches a known version, all required string fields present and non-empty, `tp` matches a real template id, `or` is one of the two valid values. Anything that fails validation is treated as **invalid**, distinct from a **save error** (decoding succeeded but writing to IndexedDB failed) — both are shown to the user, both prompt "scan the QR again."

## Transfer Flow

1. Customer scans the QR (from the Commerce status page, admin dashboard, or wherever it's printed/displayed) → lands on `/holder/install#<encoded-card>`.
2. The page decodes and validates the fragment.
   - Invalid → error state: "This code isn't valid — ask for a new one." No retry loop client-side; scanning again is the only path forward (the QR itself hasn't changed, so a genuinely corrupted scan usually means try again from a cleaner angle/lighting).
   - Valid → attempt to save into the Holder's local storage (IndexedDB).
     - Save fails → error state, same "scan again" prompt.
     - Save succeeds → clear the fragment from the browser's address bar/history via `history.replaceState()` (the raw card data shouldn't linger in browser history once it's safely persisted), show a brief confirmation, then move to `/holder`.
3. If this exact card is already saved locally (a refresh, or scanning the same QR twice on the same phone), the install page detects that up front and skips straight to `/holder` — no re-decode, no re-save, no error.

No network request is made anywhere in this flow beyond the page's own static assets and, if the card has a logo, that one image fetch.

## The Holder App

`/holder` is the persistent home view:
- Renders the saved card using Builder's existing template components (`components/templates/*`), unmodified — same visual result as the live preview the customer approved during Builder.
- Empty state ("No card yet — scan your provisioning QR to add one") if nothing is saved on this device.
- Actions:
  - **Install to home screen** — a `manifest.ts` scoped to `/holder` (`start_url`/`scope: '/holder'`) enables the native install prompt on browsers that support it (Chrome/Android). iOS Safari has no such API; it gets a short instructional hint (Share → Add to Home Screen) instead.
  - **Save to Contacts** — generates a standard `.vcf` vCard client-side and downloads it.
  - **Share** — Web Share API (`navigator.share`) where available, with a copy-link fallback where it isn't.
- **Offline**: a minimal hand-rolled service worker (no library — the offline surface here is small: the `/holder` shell plus one logo image) caches what's needed on first load so the view keeps working with no connection afterward.

## Server-Side Retention and Customer History Archive

Because the server can't observe whether a transfer ever happens, cleanup runs on a timer instead of a completion event — a cron mirroring Builder's existing `expire-drafts` pattern, triggered by `status: approved` and `updatedAt` older than 48 hours.

**Revised requirement:** the product owner needs a durable record of customer/order history for investor pitch-deck traction purposes (real counts, revenue, and — deliberately — actual customer names/companies as social proof, not just aggregate numbers), while keeping that PII out of the live, internet-facing database past its useful window, to limit ongoing breach exposure. Before the cron nulls a draft's PII, it archives the full record into a new admin-only `customer_history` table:

| Field | Notes |
|---|---|
| `id` | uuid, primary key |
| `orderId` | the source order's id (informational, not a hard FK — the order row survives independently) |
| `firstName`, `lastName`, `jobTitle`, `company`, `mobile`, `email` | copied verbatim before the draft's own copies are nulled |
| `templateId` | which template they chose |
| `amount` | revenue from this order |
| `orderCreatedAt` | when the order was placed — for growth-over-time reporting |
| `archivedAt` | when the cron captured this row |

This table is never exposed to any customer-facing route — only readable via a password-gated admin export. The cron's cleanup sequence becomes: insert into `customer_history` → delete the payment-proof and logo blobs → null the draft's PII fields → null the order's `paymentProofUrl`, exactly as before except for the new first step.

**Export, not push:** a server cannot place a file on an admin's machine unprompted — "auto download" in any technically honest sense means the system automatically *captures* the data (no manual data-entry or export step required per order), and the admin gets a one-click **Download CSV** action on the admin dashboard whenever they actually want a local copy. CSV opens directly in Excel/Sheets without needing an `.xlsx`-writing dependency.

This whole mechanism is entirely separate from and invisible to the transfer flow above — it happens (or doesn't, if a customer never got that far) regardless of whether the QR was ever scanned, and it doesn't touch the "zero DB dependency" constraint, which was always specifically about the *transfer*, not Commerce's own backend bookkeeping.

## API Surface (new + changed)

New:
- (none server-side for the transfer itself — by design, it's client-only)
- `GET /api/cron/cleanup-approved-orders` — the retention cron, now also archiving to `customer_history`
- `GET /api/admin/customer-history/export` — admin-only CSV download of the accumulated history

Changed:
- `GET /api/orders/[id]` — now includes the linked draft's card fields (previously order-only)
- `POST /api/admin/orders/[id]/approve` — no longer generates a token, just flips status

Removed:
- `POST /api/admin/orders/[id]/provisioning-qr/regenerate`
- `POST /api/admin/orders/[id]/provisioning-qr/expire`

## Testing

- Unit tests: card encode/decode round-trip, decode validation (malformed base64, malformed JSON, wrong version, missing fields, unknown template id) both directions
- Unit tests: IndexedDB storage helper (save, get, has-card check) — using an in-memory IndexedDB shim under Vitest/jsdom, the established pattern for browser-API-dependent unit tests in this codebase
- Component tests: `/holder/install`'s state machine (validating → success / invalid / save-error), `/holder`'s empty vs. populated states
- API route tests: the changed `GET /api/orders/[id]` (draft fields present), the retention cron (blob deletion, PII nulling, age-gating, `customer_history` archival) — same pattern as Builder's `expire-drafts` tests
- API route tests: the admin CSV export (admin-auth-gated, correct rows/columns, empty-history case)
- One Playwright E2E extending the existing happy path: submit a draft → checkout → pay → admin approves → capture the encoded fragment the QR would carry → navigate directly to `/holder/install#<fragment>` (a real camera scan isn't something Playwright can simulate) → confirm the card saves and renders at `/holder`
