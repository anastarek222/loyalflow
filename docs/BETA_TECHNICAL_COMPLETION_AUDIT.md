# LoyalFlow Beta Technical Completion Audit

Date: 2026-08-15
Status: `INTERNAL_BETA_HARDENING_ACTIVE`
Environment: isolated Staging Beta only

## Outcome

The previously safe technical backlog was exhausted. The product owner then
approved Vercel Blob and a preserve-all Beta lifecycle for TC3 Custom Card.
Deployment `dpl_BicNVV3Q4PbHsmVRwtMPXc73msQD` now verifies that path on
isolated Staging with a synthetic Super Admin/MFA fixture: private front/back
upload, immutable draft preview, explicit publish, one audit activity, and
token-bound public delivery all passed. Database/browser fixtures returned to
zero; the two immutable Blob objects remain under the approved preserve-all
Beta rule.

The latest bundle centralizes the duplicated protected own-business API read
boundary. Both existing protected `/api/v1` reads now share request-ID,
authentication, tenant, capability, and safe 401/403/404 mapping while retaining
their existing DTOs, queries, response envelopes, and no-write behavior. It
adds no endpoint and publishes no external API commitment.

The temporary Internal/Synthetic Beta override also reopens already named,
dependency-safe hardening work. TC2.2 extracts app-shell navigation messages to
separate AR/EN catalogs with compile-time parity while retaining all web-owned
authorization, route, ordering, and experience-mode behavior. Evidence passes
32/32 focused and 1010/1010 full tests, TypeScript, full ESLint with 0 errors,
the local Next.js 16.2.11 webpack build, and diff integrity. This does not
replace Real Closed Beta or final accessibility/Production evidence.

TC2.3 completes the remaining Phase 2 administration-navigation source using
the same catalogs. Focused evidence passes 13/13 and the combined head passes
1012/1012 tests, TypeScript, full ESLint with 0 errors, the local Next.js
16.2.11 webpack build, and diff integrity while capability, tenant, route, and
ordering authority remain in the web adapter.

TC2.4 begins bounded Phase 3 auth extraction: 34 existing `auth.*` values now
have separately sourced AR/EN ownership and compile-time parity while the
legacy catalog remains the compatibility adapter. Focused auth/MFA and boundary
evidence passes 18/18 and the final combined head passes 1015/1015 tests,
TypeScript, full ESLint with 0 errors, the local Next.js 16.2.11 webpack build,
and diff integrity; no authentication behavior moved.

## Completed technical foundations

- TC1 domain/customer contracts;
- TC2 AR/EN common, app-shell, administration navigation, and auth-message
  extraction plus compatibility;
- TC3 enrollment, card projection, and Standard Card ownership;
- TC3 private Custom Card draft upload, immutable versioning, authenticated
  preview, explicit publish, retained history, and token-bound delivery;
- TC4 provider-neutral lifecycle plus read-only runtime billing projection;
- TC5 same-origin API read foundation, authenticated parity, 405 hardening, and
  shared protected-read boundary;
- TC6 health/retry contracts plus privacy-minimized Operations status snapshot;
- TC7 invitation-only bilingual Beta acquisition;
- TC8 isolated-Staging technical entry evidence, including role/MFA,
  performance, rollback/forward recovery, and zero-fixture cleanup.

## Remaining gate boundaries

The remaining items are not additional safe code cleanup. Each requires at
least one explicitly deferred input:

- Custom Card retention/deletion and provider cleanup/rollback remain a later
  pre-Production decision/evidence gate; the Staging lifecycle itself passes;
- subscriptions require persistence/idempotency design and payment/provider
  decisions;
- API writes require a named consumer and approved CSRF/idempotency/transaction
  contract;
- durable integration execution requires worker/queue/provider/retry policy and
  pending-age/SLO decisions;
- public acquisition requires legal, trial, pricing, analytics, and payment
  decisions;
- recovery requires tooling that can prove a disposable database was forked
  from isolated Staging rather than Production;
- Beta exit is `DEFERRED_REAL_CLOSED_BETA` and still requires 5-10 real
  participants, issue disposition, and a human Go/No-Go;
- Production requires separate explicit authorization.

The temporary Product override permits other named Internal/Synthetic Beta
slices to continue without treating them as real-participant or Production
evidence. The disposable-database restore remains deferred because the current
branch tool cannot select isolated Staging as parent without crossing the
Production boundary. Phase 2 common/navigation and the bounded Phase 3 auth
catalog extraction are complete. Password-policy validation localization stays
a later Phase 3 slice and must preserve existing security behavior.
