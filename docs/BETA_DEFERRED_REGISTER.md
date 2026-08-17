# LoyalFlow Beta Deferred Register

Last updated: 2026-08-17
Execution environment: isolated `staging` Beta only
Production status: forbidden until explicit later authorization

## Purpose

This is the current durable list of work that remains intentionally open after the validated technical Beta foundation. A row stays here because it requires a Product, legal, provider, real-participant, measured-recovery, or Production decision/evidence gate. Completed TC5/TC6 implementation must not be described as deferred work.

Synthetic fixtures, tests, CI and Staging deployments are technical evidence only. They cannot satisfy real-participant or Production gates.

## Current deferred register

| Area | Validated Beta foundation | Still deferred | Required closing evidence |
| --- | --- | --- | --- |
| **TC3 Cards / Custom Card** | Standard/Public Card contract, flip, dimensions/safe zones/QR plus private immutable Custom Card front/back upload, authenticated preview, explicit publish and token-bound public delivery verified on isolated Staging | final Standard/Custom Card visual direction; final retention/deletion policy; provider-artifact cleanup/rollback policy before Production | approved Product/UI design plus retention/cleanup policy and any required provider rollback evidence |
| **TC4 Subscription / commercial lifecycle** | provider-neutral lifecycle persistence and runtime entitlements across the validated operational Beta surfaces | trusted commercial provider events, pricing/package decisions, checkout, billing/payment activation, renewal/failure behavior and any remaining commercial-only policy | approved commercial model plus trusted idempotent provider/payment evidence |
| **TC5 API / architecture** | same-origin v1 read foundation and validated internal safe-write command/action boundaries are integrated | external/public API publication, external consumer contract, legacy/public compatibility commitments if Product chooses to expose them | named external consumer, version/security/compatibility decision and external contract evidence |
| **TC6 Integrations** | durable PostgreSQL outbox, Vercel Queues, retry policy, leases, reconciliation, five-minute Beta heartbeat, automatic mutation cutovers and live isolated-Staging recovery/no-duplicate proof are PASS | Production SLO/severity/alert policy, Production provider hardening and any additional provider/job kinds not part of the current Beta contract | approved Production observability/provider policy and Production-authorized evidence |
| **TC7 Acquisition** | `BETA_INVITATION_ONLY`, existing-account login, bilingual secure Owner invitation, RTL/LTR and protected acquisition boundary | self-service signup, trial bootstrap, pricing, legal/consent, analytics policy and public commercial acquisition | explicit Product/legal/analytics decisions plus bounded persistence/provider evidence |
| **T007 / TC8 Real Closed Beta** | isolated Staging technical entry, role/MFA evidence, critical-journey synthetic evidence, TC8 preparation/execution kit, TC6 runtime recovery PASS | 5–10 real businesses, participant issue log/disposition, exit-evidence freshness and human Go/No-Go | minimum five completed anonymous participant records, reconciled issues and explicit `GO`, `NO-GO`, or `CONDITIONAL GO` |
| **Recovery** | Git-based Staging rollback/forward recovery plus TC6 queue/reconciliation runtime recovery proof | measured disposable-database restore rehearsal where still required by launch governance | isolated disposable restore, timing/integrity evidence and complete cleanup |
| **Final UI / presentation** | functional responsive AR/EN surfaces, canonical card renderer and UI/UX preparation baseline | final page composition, visual hierarchy, design tokens rollout, final card artwork, brand styling, typography, final copy/media | approved Product/UI direction and final accessibility/responsive presentation acceptance |
| **Legal / privacy / analytics** | technical tenant/auth/privacy boundaries and privacy-safe Beta evidence rules | Terms, Privacy Policy, consent/data-retention policy, cookies/analytics activation | approved legal/privacy policy and implementation evidence |
| **Production** | no Production action in the current Beta | Production environment, domain/release promotion, Production secrets/providers, monitoring/alerts, final rollback/recovery freshness and launch authorization | all relevant gates closed plus explicit human Production authorization |

## Closed/deferred items removed from the old register

The following are no longer deferred implementation work and must not be reopened without a new regression or Product decision:

- TC5 internal validated safe-write migration;
- TC6 Beta retry/backoff policy;
- TC6 stranded-job reconciliation;
- TC6 five-minute recovery heartbeat;
- TC6 Customer Record/Status, balance, Earn, Redeem, Customer Create, Bulk, Playbook and automatic Settings Google Sheets outbox cutovers;
- TC6 isolated-Staging recovery/lease/no-duplicate runtime proof.

## Current evidence anchors

- PR #199: final automatic Settings durable-outbox cutover, validation #247, merged `791fd005f3ab69eae3eba62f2a5bc73f61107a6f`.
- PR #200: final combined TC6 recovery rehearsal validation #248, merged `1795327cf12fe21dea12673da44b4a839fb6edbb`.
- Runtime deployment `dpl_DaVXWYmbCMkwrrfiaGmx1jYM7fKj`: heartbeat → reconciliation → integration-job worker → one leased attempt → non-retryable terminalization → following-heartbeat no-reprocessing; proof fixtures cleaned to zero.
- Issue #103: single operational authority for the 5–10 business Real Closed Beta.
- `docs/BETA_FINAL_RECONCILIATION_2026-08-17.md`: current Beta coordination record.

## Operating rules

- Continue on isolated Staging until a later explicit Production gate.
- Never count synthetic tenants as real TC8 participants.
- Never put participant PII, credentials, secrets, tokens or unnecessary customer data into evidence.
- Do not repeat broad role/Super Admin UAT unless a change materially touches those boundaries.
- Keep synthetic fixtures minimal and clean them to zero.
- Do not reopen completed TC5/TC6 work just because older documents or branches still mention it.
- Final visual/product decisions are not technical defects unless the current functional contract is broken.
- Production remains a separate explicit authorization, never an implication of Beta completion.
