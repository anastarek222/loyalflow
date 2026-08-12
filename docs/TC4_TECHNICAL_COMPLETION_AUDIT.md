# TC4 Technical Completion Audit

Date: 2026-08-12

Status: `BLOCKED_PRODUCT_DECISION`

## Scope

TC4 maps Product P3, P9.5, and P11.1-P11.6 to Modernization P8 and P20.
Its launch-scope outcome is completed account and business-settings ownership
plus a provider-neutral plan, subscription, and billing lifecycle before any
payment-provider activation. Gates G09, G16, and G19 remain binding.

## Current verified state

- Product P3 account and authentication is already complete through the
  password, session-revocation, invitation, email-verification, Super Admin
  MFA, distributed rate-limit, and security-notification slices recorded in
  the Master Delivery Tracker. TC4 must preserve that implementation rather
  than reopen authentication policy.
- Business profile and operations settings have separate validated update
  domains in `lib/business/settings-domains.ts` and server-enforced actions.
- The existing schema already records a business plan, plan-change timestamp,
  billing interval, billing dates, amount in minor units, currency, payment
  status, grace period, payment method, and bounded notes.
- `lib/entitlements.ts` is the current deterministic plan catalogue, while
  `lib/entitlements-server.ts` applies persisted plan-configuration overrides.
- `lib/billing/subscription.ts` validates the existing manual billing input,
  calculates intervals, derives operational payment states, and normalizes
  recurring value without a payment-provider dependency.
- Super Admin can assign plans and maintain the existing manual billing state.
  Current tests cover plan limits, billing validation, date calculations,
  payment-state derivation, role boundaries, and operational visibility.
- Public self-signup and payment checkout are explicitly unavailable in the
  current release; existing public copy and browser tests prevent inventing
  unsupported signup, checkout, or payment routes.

## Gaps before TC4 can complete

1. There is no approved Launch V1 state machine for signup, trial activation,
   trial expiry, checkout initiation, payment success/failure, grace,
   suspension, cancellation, renewal, or reactivation.
2. The authoritative relationship between commercial billing state and
   feature entitlement enforcement is not approved. The current manual
   `Business.plan` and payment fields must not be reinterpreted speculatively.
3. Customer-facing account/subscription ownership, plan-change permissions,
   proration/refund behavior, invoice/receipt ownership, and failure recovery
   have no approved product contract.
4. No payment provider, webhook contract, idempotency model, or credential
   boundary is approved. Provider activation is explicitly outside this audit.
5. Completing those transitions may require additive persistence and migration
   work. This audit neither proposes nor authorizes schema changes.
6. G09 safe-write parity, G16 auth/tenancy review, and G19 AR/EN browser evidence
   cannot be claimed until the lifecycle contract is approved and implemented.

## Risk and stop assessment

| Area | Audit result |
|---|---|
| Schema or migration | Potentially required for durable lifecycle, provider event, invoice, or idempotency state; not authorized. |
| Credentials/provider | Required for payment activation; no provider or credentials approved. |
| Production | No Production action is permitted or required by this audit. |
| Database writes | None performed. |
| Existing accounts/auth | Must remain unchanged. |
| Existing plans/billing | Preserve current manual state and entitlement behavior until an approved transition contract exists. |

## Decision required

TC4 implementation is blocked pending an approved provider-neutral lifecycle
contract covering the states, transitions, actors, entitlement consequences,
failure recovery, and audit/idempotency requirements above. Payment-provider
selection can remain later, but the product lifecycle itself must be decided
before code changes.

No runtime, schema, migration, environment, credential, deployment, database,
or Production change is included in this audit.

## Later-phase routing audit

- TC5 cannot safely start its read/write ownership cutover while the recorded
  API auth/topology and hosting decisions remain open.
- TC6 contains database, integration, recovery, monitoring, and performance
  work that requires migrations, provider/runtime operations, database access,
  or separately approved execution evidence.
- TC7 depends on the same unresolved public signup, legal, billing, and payment
  lifecycle decisions identified by TC4.
- TC8 requires authenticated staging fixtures/database writes, rollback work,
  Closed Beta, and an explicit Go/No-Go.

Accordingly, no later overlay phase currently supplies a bounded implementation
slice within the Fast Track constraints of no database writes, migrations,
credentials, provider choice, Production action, or unresolved product policy.
