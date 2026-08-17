# LoyalFlow Beta Final Reconciliation — 2026-08-17

Status: `TECHNICAL_BETA_CLOSEOUT_IN_PROGRESS`
Environment: isolated `staging` Beta only
Production: not authorized

## Purpose

This record reconciles the current Product/TC/TR/TCR truth after the TC5 safe-write integration, TC6 durable integration/recovery work, TC8 preparation, and stale-PR cleanup. Historical audit files remain evidence for their original checkpoints; this record is the current coordination authority for the Beta closeout.

## Integrated technical state

- TC3 Custom Card Staging lifecycle is verified: private immutable front/back artwork, authenticated Super Admin preview, explicit publish, token-bound public delivery, and database fixture cleanup.
- TC4 provider-neutral subscription lifecycle and persisted entitlement enforcement cover the validated operational Beta surfaces. Commercial provider events, checkout, billing/payment activation, pricing/legal decisions remain separate.
- TC5 current internal safe-write migration is integrated for the validated writer set. Command boundaries preserve server-derived authority, tenant isolation, transaction ownership, idempotency/replay policy where applicable, and current compatibility surfaces. External/public API publication is not claimed.
- TC6 current mutation follow-ups use durable PostgreSQL IntegrationJob outbox behavior for Customer Record/Status, balance adjustment, loyalty earn, loyalty redemption, customer creation, bulk customer status/tags, Playbook application, and automatic Profile/Program Settings Sheets follow-up.
- TC6 retry policy, Vercel Queues transport, worker lease, stranded-job reconciliation, five-minute Beta recovery heartbeat, and the final combined recovery rehearsal are integrated.
- TC7 invitation-only bilingual Beta acquisition remains the active acquisition mode; self-service commercial acquisition remains deferred.
- TC8 preparation and execution kit are integrated: cohort criteria, participant tracker, privacy-safe issue log, Go/No-Go scorecard, recruitment/consent guidance, session runbook, evidence checklist, and daily triage cadence.

## TC6 validation evidence

- PR #199 final Settings automatic Sheets outbox cutover passed Staging PR Validation run #247 and merged at `791fd005f3ab69eae3eba62f2a5bc73f61107a6f`.
- PR #200 reapplied the TC6.17 recovery rehearsal onto the fully integrated state; Staging PR Validation run #248 passed the full suite, typecheck, workspace validation, lint, Next build, and whitespace checks. PR #200 merged at `1795327cf12fe21dea12673da44b4a839fb6edbb`.
- Runtime behavior release `791fd005f3ab69eae3eba62f2a5bc73f61107a6f` is Ready on Vercel deployment `dpl_DaVXWYmbCMkwrrfiaGmx1jYM7fKj`. PR #200 is test-only and changes no runtime behavior.
- The commit-gated Staging recovery proof trigger returned HTTP 200 and published the internal recovery heartbeat.
- Vercel runtime evidence shows the recovery Queue consumer executing successfully and the delayed successor heartbeat continuing the chain.
- One synthetic Staging IntegrationJob fixture was intentionally configured with a nonexistent mapped Google Sheet ID so the worker could exercise provider-read/mapping failure without creating or modifying any Google Sheet.
- The delayed recovery heartbeat selected the due job and woke `/api/queues/integration-jobs`; the worker made one durable attempt, terminalized the non-retryable `MAPPED_SHEET_MISSING` result as `DEAD`, and released the lease.

Final duplicate/no-reprocessing observation and fixture cleanup are recorded before changing TC6 status to closed.

## Final functional-pass reconciliation

The current `staging` branch already contains the previously separated Custom Card and critical-journey fixes. Comparison against `agent/card-flip-parity`, `agent/tc3-card-visual-corrections`, `agent/tc3-custom-card-beta`, `agent/tc8-synthetic-beta-evidence`, `agent/tc8-role-matrix-evidence`, and `agent/tc8-auth-primary-diagnostics` shows zero commits/files ahead of `staging`.

The integrated full test suite includes explicit contracts for:

- canonical front/back 3D card flip behavior;
- Standard Card physical aspect ratio, QR bounds, and safe zones;
- Custom artwork readability and one canonical renderer path;
- private Custom Card draft/publish/public delivery boundaries;
- AR/EN and RTL/LTR behavior;
- authentication, role, capability and tenant isolation;
- Customer create/search/record maintenance;
- Earn, Redeem and balance adjustment;
- Reports, Settings, Program and public-card contracts;
- TC6 outbox, retry, recovery and Queue boundaries.

This is a technical/functional Beta pass. Final visual design decisions such as final card artwork, final page composition, branding, typography and presentation polish remain a later Product/UI decision pass and are not represented as technical defects.

## PR reconciliation

The active pull-request queue was reconciled to zero open PRs. Obsolete or absorbed checkpoints were explicitly closed rather than merged back over newer state, including #54, #129, #173 and #191. This prevents stale tracker or dependency claims from being reintroduced.

## Remaining Beta exit

After TC6 runtime proof cleanup closes, the only major current Beta exit that requires external human input is TC8/T007 Real Closed Beta:

- 5–10 real businesses;
- privacy-safe participant records;
- governed critical journeys per participant;
- issue disposition;
- no unresolved security/tenant/data-integrity blockers;
- explicit human `GO`, `NO-GO`, or `CONDITIONAL GO`.

Synthetic fixtures and CI cannot satisfy those participant boxes.

## Still deferred beyond the technical Beta

- final Custom Card/Standard Card visual decisions and final UI/UX presentation pass;
- self-service signup/trial/pricing decisions;
- legal/consent/privacy/analytics policy activation;
- payment provider, checkout, billing and renewal activation;
- final Custom Card provider retention/deletion/rollback policy;
- measured disposable-database restore evidence where still required;
- Production environment, release promotion, monitoring/alerts and launch authorization.

No item above authorizes Production by implication.
