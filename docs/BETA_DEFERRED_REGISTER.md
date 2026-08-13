# LoyalFlow Beta Deferred Register

Last updated: 2026-08-13
Execution environment: isolated `staging` Beta only
Production status: forbidden until an explicit later authorization

## Purpose

This is the single durable register for work that has a merged Beta foundation but is not complete for Production or public launch. Items stay here until their named evidence or decision is merged. Synthetic fixtures, unit tests, green builds, and Staging deployments must not be promoted into real-participant or Production claims.

## Deferred register

| Area | Completed Beta foundation | Still deferred | Required closing evidence |
| --- | --- | --- | --- |
| TC3 Custom Card | Standard Card is the only operational authoring path; current Custom Card data is preserved | object-storage provider, upload/version/publish/delete lifecycle, retention policy, credentials, schema/migration | approved provider and lifecycle, isolated migration evidence, storage UAT, cleanup/rollback |
| TC4 subscriptions | provider-neutral lifecycle/access policy plus a read-only Operations projection from current manual billing state | lifecycle persistence/enforcement, cancellation-period state, provider events, checkout, billing and payment activation | approved schema/migration, trusted idempotent event contract, provider credentials, isolated runtime UAT |
| TC5 API | same-origin v1 read foundation, safe envelopes, 405 hardening, authenticated Owner UAT, and one shared protected own-business read boundary | write architecture, legacy migration, external publication | CSRF/idempotency/transaction policy, named consumer, compatibility and security evidence |
| TC6 integrations | health aggregation, retry-eligibility contracts, and a privacy-minimized read-only Operations status snapshot | canonical pending-start source and aging thresholds, worker/queue, retry execution/backoff, SLO/severity/alerts | approved execution topology, persistence/provider policy, runtime aging and recovery evidence |
| TC7 acquisition | `BETA_INVITATION_ONLY`, existing login, bilingual secure Owner invitation, `noindex`, RTL/LTR, and token-preserving language refresh | self-service signup, tenant/trial bootstrap, legal-consent lifecycle, pricing, analytics, billing/payment | approved product/legal/analytics policies plus isolated persistence/provider evidence |
| T007/TC8 Beta exit | isolated Staging, role/MFA evidence, performance sample, rollback rehearsal, synthetic Beta UAT | 5-10 real businesses, participant issue log, human Go/No-Go | five minimum completed anonymous participant records, issue disposition, explicit decision |
| Recovery | application rollback and forward recovery passed on Staging | measured disposable-database backup/restore recovery | isolated disposable restore rehearsal with timing, integrity checks, and cleanup |
| Production | no current action | domain/release promotion, Production migrations, monitoring/recovery proof, launch approval | explicit authorization after every relevant gate above closes |

## Operating rules

- Continue bounded technical Beta slices on isolated Staging.
- Never use Production data, credentials, deployment, migration, or provider activation.
- Do not repeat broad role or Super Admin UAT unless a change materially touches those boundaries.
- Keep fixtures synthetic, minimal, isolated, and cleaned to zero.
- Update this register in the same PR that closes or adds a deferred dependency.
- Merge with merge commits; do not silently squash away evidence SHAs.
- Label synthetic, technical, real-participant, and Production evidence distinctly.

## Current next technical direction

The safe technical backlog that needs no new product/provider/data/Production decision is exhausted. Do not create more speculative contracts, read-only panels, or repeated synthetic role UAT. Resume from a named deferred item only when its required decision/evidence is available. The real-business Closed Beta remains tracked in Issue #103 and does not count as completed.
