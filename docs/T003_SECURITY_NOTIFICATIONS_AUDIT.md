# T003 Security Notifications Audit

## Baseline

`main` after merged PR #48 (`46a266fa9381df2c444fc0bf8d547e2d5e3fa4d7`).

## Current state

The existing `Notification` model is tenant/business scoped: `businessId` is required and the optional `userId` relation is composite with `[userId, businessId]`. That works for business notifications, but it cannot safely represent account-level security events for users without a business, including `SUPER_ADMIN` and an unassigned pending `OWNER`.

T003 security events span both tenant-bound and account-level users. Relevant account/session events include password change, password reset, logout-everywhere/session revocation, and Super Admin MFA lifecycle events. Reusing the current business notification record for these events would either require a fake tenant, omit affected account classes, or weaken tenant semantics.

## Recommended bounded design

Add a dedicated account-scoped security notification lifecycle rather than changing the existing business notification meaning.

Recommended persistence:

- `SecurityNotification` (or equivalent) owned directly by `User` via `userId`.
- typed event kind rather than free-form business notification type.
- bounded title/message or structured event metadata sufficient for AR/EN presentation without storing secrets.
- `createdAt` and optional read/delivery state as required by the chosen product surface.
- cascade only with the owning user.

Recommended initial events:

- password changed
- password reset completed
- sessions revoked / logout everywhere
- Super Admin MFA enabled
- Super Admin MFA recovery code used (high-value signal)

The slice should not expose passwords, reset tokens, TOTP secrets, recovery codes, auth/session tokens, raw credentials, or unrestricted request metadata.

## Decision / protected boundary

Implementing the recommended design requires a Prisma schema + forward-only migration and therefore needs explicit user approval. No database command, migration execution, backfill, seed, reset, or production operation is authorized by this audit.

Existing business notifications should remain unchanged in this slice to avoid a cross-cutting notification rewrite.

## Proposed verification

- behavioral tests prove account notifications work for both business-less `SUPER_ADMIN` and pending/unassigned `OWNER`.
- event creation is scoped to the affected user and does not leak cross-account data.
- sensitive material is absent from persisted payloads and presentation.
- password change/reset/session revocation/MFA event hooks are transactionally or safely sequenced so notification failure cannot corrupt the security mutation.
- full tests, typecheck, lint, and build/preview when available.
