# LoyalFlow Master Delivery Tracker

Last verified: 2026-08-10

Baseline: `main` at `f2bf363bc289a177be7a36c02a7c26ea04446cdc` (merged PR #63)

Latest T007 verification: the isolated Vercel runtime is READY on release `fa5b9f07449d`; live/readiness health return HTTP 200 with `environment: staging`. The eleven reviewed pending migrations were applied only to Neon Staging and read-only verification now reports 46/46 applied with no incomplete migration; Production remains at its 35-migration baseline. Fresh protected-Staging public browser evidence passed 4/4 across desktop/mobile. After isolated Upstash configuration was added and Staging was redeployed, authenticated Owner UAT passed 1/1, covering an invalid login, a valid login, Dashboard and reports, customer search, exact-once Earn from 4 to 5 across reload, and Redeem. The disposable fixture was fully cleaned (0 businesses/users/customers). The latest 20-request performance sample still had 0% errors but p95 8,739 ms against the 1,500 ms budget.

## How to use this tracker

This file joins two different planning views without treating them as interchangeable:

- **Product delivery P0-P12** tracks whether LoyalFlow is safe, usable, operable, and sellable.
- **Modernization P0-P25** tracks the internal architecture migration from the current Next.js monolith toward domain/API ownership.
- **Technical Completion Overlay** classifies unfinished work as technical-now or final presentation/content-later without replacing either phase model. See [`TECHNICAL_COMPLETION_OVERLAY.md`](./TECHNICAL_COMPLETION_OVERLAY.md).

`Complete` means the agreed exit evidence for the current execution gate is merged. `In progress` means useful slices are merged but the broader phase exit gate is still open. `Foundation present` means product functionality exists, but the phase still lacks its final operational or UX evidence. Percentages are planning estimates, not CI measurements.

## Current decision

**T004, T005, and T006 are complete for their current execution gates. T007 is in progress.** T007 now has an active isolated Vercel/Neon Staging runtime, schema parity, passing public browser evidence, working isolated Redis-backed authentication, and a passing authenticated Owner Earn/Redeem UAT. T007 is not complete because performance exceeds budget, the remaining role/onboarding browser matrix and Super Admin MFA fixture are open, and rollback rehearsal plus the 5-10 business Closed Beta have not run.

The next executable T007 step is **complete the remaining authenticated role/onboarding matrix and disposable Super Admin MFA fixture, then remeasure and diagnose the failing performance budget**. Record rollback evidence before any real beta participant enrollment. Production execution remains forbidden. T008 remains blocked until T007 exit evidence and an explicit Go/No-Go decision exist.

On 2026-08-12, the product owner approved a technical-first execution priority. The original Product `P0-P12`, Modernization `P0-P25`, gate, PR, database-safety, staging, and release rules remain binding. Final brand styling, final card artwork, and final public copy/media are deferred to a separate presentation/content pass; functional behavior, accessibility, responsive AR/EN support, backend boundaries, subscriptions, cards, enrollment, and launch evidence are not deferred. This decision is recorded in the Technical Completion Overlay and does not change a phase percentage or claim merged runtime evidence.

On 2026-08-12, PR #69 merged TC1.1 through TC3.2 into `staging` with merge commit `3f739dba9960ad6574385a8bfd5086276fc468e5`; required checks passed and the automatic Vercel `staging` Preview reached Ready for that commit. Authenticated Owner UAT for PR #69 was not completed because the available fixture execution could not satisfy the fail-closed database-identity and Preview-protection proof. No fixture was created, and this evidence remains required before Production.

The product owner classified the remaining TC3 Custom Card upload/storage/version/publish lifecycle as `DEFERRED_PRODUCT_DECISION`: no Object Storage provider, retention/versioning/deletion policy, credentials, schema, or migration is approved. Standard Card remains the only operational authoring path, while any existing Custom Card data must be preserved unchanged. The approved TC4 provider-neutral lifecycle now has a pure domain foundation with no persistence or provider dependency. Runtime persistence, provider-event consumption, checkout, and payment activation remain deferred and TC4 is not complete. See [`TC4_TECHNICAL_COMPLETION_AUDIT.md`](./TC4_TECHNICAL_COMPLETION_AUDIT.md).

TC5 now has approved same-origin BFF, current-app Vercel hosting, NextAuth server-identity, and path-based API-versioning decisions. Its first bounded pure/read-only foundation introduces transport-neutral v1 envelopes, safe request correlation, server-derived actor context, and additive internal-foundation version/liveness endpoints. Authenticated domain reads, writes, typed-client publication, and legacy removal remain later gated slices. See [`TC5_API_FOUNDATION_AUDIT.md`](./TC5_API_FOUNDATION_AUDIT.md).

TC5 read extraction 2 adds a minimized authenticated business summary derived only from the current session tenant. It exposes business identity, loyalty-programme rules, and aggregate customer/branch counts while excluding contacts, billing, notes, credentials, and customer records. See [`TC5_READ_EXTRACTION_2_AUDIT.md`](./TC5_READ_EXTRACTION_2_AUDIT.md).

TC5 read extraction 3 adds a session-tenant-derived access projection that reuses the canonical role capabilities and plan feature entitlements. It exposes identifier lists only, with no billing, usage, customer, contact, note, credential, or provider data. See [`TC5_READ_EXTRACTION_3_AUDIT.md`](./TC5_READ_EXTRACTION_3_AUDIT.md).

TC5 read-foundation audit now classifies the approved current-consumption foundation as complete: four read-only `/api/v1` endpoints plus transport-neutral contracts, safe response/request adapters, and session-derived tenant/capability enforcement. No current UI code consumes `/api/v1`; direct server-only domain/query use by Server Components and Server Actions remains intentional. TC5 write architecture, legacy API migration, external publication, unsupported-method cache hardening, and authenticated Preview replay remain open and are not completion evidence for broader TC5. See [`TC5_COMPLETION_AUDIT.md`](./TC5_COMPLETION_AUDIT.md).

TC6.1 implements a pure provider-neutral integration-health contract over the current Google Sheets status model. It provides fail-closed mapping, aggregate-only status/failure counts, and deterministic pending aging whose numerical thresholds must be supplied by an approved caller. This is contract/unit-test evidence only: it adds no runtime reader, endpoint, database or provider operation, severity/SLO policy, alerting, durable execution, credentials, or Production capability. See [`TC6_1_INTEGRATION_HEALTH_CONTRACT.md`](./TC6_1_INTEGRATION_HEALTH_CONTRACT.md).

Current local working-tree checkpoint on 2026-08-12: the uncommitted T006/P9 presentation and role-parity slices plus technical overlay slices TC1.1, TC2.1, and TC3.1 pass 879/879 tests, TypeScript, workspace-boundary validation, `git diff --check`, and a Next.js 16.2.11 production build. TC1.1 activates the transport-neutral `@loyalflow/contracts` public-membership DTO/problem-code boundary and connects the existing registration adapter and Join error states without a schema, migration, visual, URL-value, or registration-behavior change. TC2.1 activates `@loyalflow/i18n/common`, separates the nine shared English and Arabic messages with compile-time and runtime key parity, and retains `lib/i18n/catalog.ts` as the compatibility adapter without changing any message value, caller, direction behavior, schema, migration, or visual output. TC3.1 gives public Join the same effective customer-plan limit authority as managed customer creation, performs the count and create inside a serializable transaction, gates referral feedback/writes and public-card referral links by the canonical plan entitlement, and accepts only a live active same-tenant referral code. It adds one bounded AR/EN plan-limit error state but no new visual direction, schema, or migration. ESLint reports 0 errors and the same 2 pre-existing unused-parameter warnings in `app/account/security/actions.ts`. This is local evidence only: it is not a commit, PR, Preview, Staging replay, merge, deployment, or phase-exit claim.

## Product delivery P0-P12

| Phase | Status | Estimate | Merged evidence | Exit still required |
|---|---|---:|---|---|
| P0 Baseline and governance | In progress | 90% | architecture plan, environment guards, governed task/PR workflow, tracker and closeout records | keep task/PR/gate links current and reconcile later launch evidence |
| P1 Loyalty and financial rules | Complete | 100% | PRs #7-#10 and reversal/ledger PRs through #30 | reopen only for an approved policy change |
| P2 Ledger integrity | Complete | 100% | durable idempotency, reversals, locking, unlock provenance/restoration, exception handling, gross/net reporting, reconciliation implementation and T002 verification | read-only/no-automatic-repair constraint preserved |
| P3 Account and authentication | Complete | 100% | secure password reset, self-service password change, logout-everywhere PR #42, pending-owner lifecycle PR #43, Owner Invitation PR #44, Email Verification PR #46, Super Admin MFA PR #47, distributed auth rate limiting PR #48, Security Notifications PR #49 | reopen only for an approved authentication/security policy change |
| P4 Database and operations | In progress | 88% | environment isolation, guarded disposable restore evidence, production recovery posture, monitoring proof, runbooks, T004 closeout, dedicated T007 Neon staging branch | measured production/service RPO/RTO remains deferred to public-launch gate; staging runtime binding still pending |
| P5 Architecture boundaries | In progress | 34% | PR #36 workspace skeleton; PR #37 first pure domain extraction; TC1/TC3/TC4 contracts and first TC5 API foundation are implemented in the current branch | merge and verify TC5 foundation, then authenticated read parity before any safe writes |
| P6 UX, design system, languages | In progress | 72% | shared UI foundations, T005 canonical AR/EN compatibility source, SSR direction handling, bilingual T006 public/onboarding flows | broader authenticated-surface parity, accessibility/device gate and later modernization work |
| P7 Marketing website | In progress | 82% | bilingual public homepage, localized SEO, supported `/get-started` conversion selector and browser UAT through PR #59 | analytics/measurement intentionally deferred to public-launch gate; later launch acquisition policy |
| P8 Business onboarding | Complete | 100% | invitation and draft foundations, bilingual owner onboarding, inline validation, supported path selection, live Standard Card preview and bounded browser UAT | reopen only for approved onboarding/product-policy changes |
| P9 Role experiences | Foundation present | 75% | Super Admin, Owner, Staff/Scan, Customer Card, reports and permissions | shell/navigation cleanup, role parity, broader mobile/browser UAT |
| P10 Staging and Closed Beta | In progress | 65% | PR #61 staging isolation contract; PR #62 E2E/performance matrix foundation; PR #63 Closed Beta operating pack, activation checklist and dedicated Neon staging branch | activate stable staging runtime, bind isolated staging data/config, record health/E2E/performance/rollback proof, run 5-10 business beta and explicit Go/No-Go |
| P11 Public-launch readiness | Foundation present | 35% | reset email, Email Verification, mandatory Super Admin MFA, distributed auth rate limiting, Security Notifications, plan/billing foundations, release and health scripts | approved signup/trial/subscription/billing lifecycle, legal/data lifecycle, measured production recovery, analytics decision, payment activation and rollback rehearsal |
| P12 Post-launch scale | Deferred | 15% | offers, referrals, campaigns, rewards, multi-branch and event foundations | demand-driven workers, webhooks, API keys, POS, wallet/tiers and physical service split |

## Modernization P0-P25

| Range | Status | Evidence / blocker |
|---|---|---|
| P0 Governance | Complete | PRs #4-#5 establish the governed baseline and environment/database guards. |
| P1 Product rules | Complete | PR #7 plus rule-protection and ledger implementation slices. |
| P2 DB/migration hardening | In progress | reviewed migration history plus T004 operational closeout evidence and dedicated Neon staging branch; measured production/service RPO/RTO remains a later launch gate. |
| P3 Workspace foundation | Complete | PR #36; root Next.js runtime remains authoritative. |
| P4 Domain/contracts | In progress | PR #37 moves `calculateRewardProgress` to `@loyalflow/domain` with a compatibility re-export; broader typed-contract evidence remains open. |
| P5 I18N foundation | Complete for compatibility gate | T005 merged canonical dependency-free AR/EN catalog/config/request foundation with legacy adapter, SSR lang/dir behavior and bounded login localization. |
| P6 API foundation | Read foundation complete; writes/external contract pending | same-origin BFF, current Vercel hosting, NextAuth identity, four read-only `/api/v1` endpoints, transport-neutral contracts, and tenant/capability adapters are merged; no current UI consumer requires more reads; approve write architecture or an external consumer contract before expanding the surface. |
| P7-P10 Reads, writes, ledger cutover, web DB removal | Not started | must execute in order with parity, tenant, idempotency, concurrency and rollback gates. |
| P11-P20 UX and product vertical migration | Foundation present | substantial product UI exists and T006 improves public/onboarding parity, but target API/i18n modernization is incomplete. |
| P21-P25 hardening, QA, staging, cutover, cleanup | In progress foundation | T007 isolation/E2E/beta foundations and a pure TC6.1 integration-health contract exist; numerical aging policy, runtime integration health, stable staging proof, active beta evidence, and eventual cutover evidence remain open. |

## Executable queue

| ID | Work item | State | Scope boundary | Required exit evidence |
|---|---|---|---|---|
| T001 | Create unified master tracker | Complete | documentation only | merged in PR #38 |
| T002 | Ledger reconciliation | Completed | read-only calculation/reporting; no automatic repair and no production execution | isolated test-database reconciliation evidence recorded |
| T003 | Authentication closeout | Completed | account/session security only; no auth-topology rewrite | merged through PR #49 |
| T004 | Operational readiness closeout | Completed | backup/restore, RPO/RTO, isolation, monitoring and runbooks | current gate closed; measured production/service RPO/RTO deferred to public-launch gate by explicit product decision |
| T005 | I18N compatibility foundation | Completed | one canonical compatibility source; no mass copy rewrite | AR/EN parity, fallback, SSR/RTL and compatibility evidence merged |
| T006 | Marketing and onboarding completion | Completed | public website and owner setup; no payment cutover | conversion routes, SEO, inline validation, live preview and bounded browser UAT merged; analytics explicitly deferred to public-launch gate |
| T007 | Isolated staging and Closed Beta | In progress | non-production only | stable staging runtime + isolated data/config binding + health/E2E/performance/rollback proof + 5-10 business beta + issue log + explicit Go/No-Go |
| T008 | Public launch readiness | Blocked | signup/legal/billing/payment/release | T007 evidence, measured launch recovery, analytics decision, rollback rehearsal and launch approval |

## Update rules

1. Update this file in the same PR that changes a phase status or closes an executable queue item.
2. Link merged PRs and reproducible checks; do not mark manual UAT, restore, staging, beta, or production evidence complete from code tests alone.
3. A failed related check, incident, rollback, schema/contract change, or expired gate reopens the affected row.
4. Never record secrets, customer data, production connection strings, or disposable test credentials here.
5. Do not delete legacy paths until parity, zero callers, observation, and rollback compatibility are all recorded.
6. Deferral is not completion evidence for the deferred capability: marketing analytics and measured production/service RPO/RTO must be revisited at the public-launch gate.
