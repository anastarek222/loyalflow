# LoyalFlow Beta Deferred Register

Last updated: 2026-08-15
Execution environment: isolated `staging` Beta only
Production status: forbidden until an explicit later authorization

## Purpose

This is the single durable register for work that has a merged Beta foundation but is not complete for Production or public launch. Items stay here until their named evidence or decision is merged. Synthetic fixtures, unit tests, green builds, and Staging deployments must not be promoted into real-participant or Production claims.

## Deferred register

| Area               | Completed Beta foundation                                                                                                                                                                                        | Still deferred                                                                                                                                | Required closing evidence                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TC3 Custom Card    | Vercel Blob Beta lifecycle implemented: private isolated upload, immutable versions, authenticated preview, explicit publish, retained history, and bounded public delivery; existing artwork remains compatible | Blob resource/token activation in Staging, live upload/publish UAT, later retention/deletion policy beyond the current preserve-all Beta rule | isolated Staging Blob resource, successful lifecycle UAT, cleanup/rollback evidence before Production |
| TC4 subscriptions  | provider-neutral lifecycle/access policy, read-only Operations projection, additive lifecycle persistence, and runtime enforcement for core loyalty operations, financial reversals, customer/team/resource/referral expansion, resource maintenance, workforce topology, customer profile/note maintenance, individual/bulk customer reactivation, individual/bulk customer-tag topology, business settings, card lifecycle, Sheets sync, and export-permission maintenance | remaining admin write parity; trusted provider events, referral rewards, and campaign execution; checkout and billing activation | parity evidence, trusted idempotent event contract, provider credentials, and payment-flow evidence   |
| TC5 API            | same-origin v1 read foundation, safe envelopes, 405 hardening, authenticated Owner UAT, and one shared protected own-business read boundary                                                                      | write architecture, legacy migration, external publication                                                                                    | CSRF/idempotency/transaction policy, named consumer, compatibility and security evidence              |
| TC6 integrations   | health aggregation, retry-eligibility contracts, a privacy-minimized read-only Operations status snapshot, an isolated-Staging-verified business-scoped outbox schema, transactional business-creation enqueue, a provider-neutral Beta transport boundary with a Vercel Queues consumer, and isolated-Staging provider-success/mapped-sheet idempotency evidence | retry/backoff policy, stranded-job dispatcher/reconciliation, remaining mutation enqueue cutover, pending aging thresholds, SLO/severity/alerts | isolated-Staging recovery evidence plus approved retry/reconciliation policy |
| TC7 acquisition    | `BETA_INVITATION_ONLY`, existing login, bilingual secure Owner invitation, `noindex`, RTL/LTR, and token-preserving language refresh                                                                             | self-service signup, tenant/trial bootstrap, legal-consent lifecycle, pricing, analytics, billing/payment                                     | approved product/legal/analytics policies plus isolated persistence/provider evidence                 |
| T007/TC8 Beta exit | isolated Staging, role/MFA evidence, performance sample, rollback rehearsal, synthetic Beta UAT                                                                                                                  | 5-10 real businesses, participant issue log, human Go/No-Go                                                                                   | five minimum completed anonymous participant records, issue disposition, explicit decision            |
| Recovery           | application rollback and forward recovery passed on Staging                                                                                                                                                      | measured disposable-database backup/restore recovery                                                                                          | isolated disposable restore rehearsal with timing, integrity checks, and cleanup                      |
| Production         | no current action                                                                                                                                                                                                | domain/release promotion, Production migrations, monitoring/recovery proof, launch approval                                                   | explicit authorization after every relevant gate above closes                                         |

## Operating rules

- Continue bounded technical Beta slices on isolated Staging.
- Never use Production data, credentials, deployment, migration, or provider activation.
- Do not repeat broad role or Super Admin UAT unless a change materially touches those boundaries.
- Keep fixtures synthetic, minimal, isolated, and cleaned to zero.
- Update this register in the same PR that closes or adds a deferred dependency.
- Merge with merge commits; do not silently squash away evidence SHAs.
- Label synthetic, technical, real-participant, and Production evidence distinctly.

## Finalization register — provider decisions

| Decision | Status | Bounded use | Durability authority | Exit/portability boundary | Not authorized |
| --- | --- | --- | --- | --- | --- |
| Vercel Queues async transport | `APPROVED_BETA`; `STAGING_RUNTIME_VERIFIED` on 2026-08-15 | Wake the TC6 Google Sheets integration-job consumer with a `jobId`-only message on isolated Staging Beta | PostgreSQL `IntegrationJob`; Queue publication is not the domain commit or source of truth | Release `23899e0fb78d` proved transactional enqueue, Queue delivery, one consumer claim/attempt, safe failure persistence, lease release, and zero cleanup. Release `0c719a3634ed` then completed provider success after the Editor grant. One replay reused mapped sheet ID `2063009995`, preserved the mapped title, and kept business/job cardinality at `1/1`; application cleanup returned zero rehearsal businesses, users, and orphan jobs. | Production activation, additional providers/job kinds, retry/backoff policy, stranded-job dispatcher, SLO/alert policy, or broader mutation cutover |

## Current next technical direction

The safe technical backlog that needs no new product/provider/data/Production decision is exhausted. Do not create more speculative contracts, read-only panels, or repeated synthetic role UAT. Resume from a named deferred item only when its required decision/evidence is available. The real-business Closed Beta remains tracked in Issue #103 and does not count as completed.
