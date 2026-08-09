# LoyalFlow Master Delivery Tracker

Last verified: 2026-08-09

Baseline: `main` at `f2bf363bc289a177be7a36c02a7c26ea04446cdc` (merged PR #63)

Latest T007 verification: repository-local gates for the E2E/performance foundation passed with 795/795 tests, TypeScript passing, ESLint 0 errors with 2 pre-existing warnings, Prisma Client 7.9.0 generation passing, and Next.js 16.2.11 production build passing with 26/26 static pages. A dedicated Neon `staging` branch (`br-late-leaf-adwhj06g`) has been provisioned and inspected. Vercel runtime activation is not yet proven because current branch deployments are blocked by the account build-rate limit and the latest known READY non-production runtime still reports `environment: preview`, not `staging`.

## How to use this tracker

This file joins two different planning views without treating them as interchangeable:

- **Product delivery P0-P12** tracks whether LoyalFlow is safe, usable, operable, and sellable.
- **Modernization P0-P25** tracks the internal architecture migration from the current Next.js monolith toward domain/API ownership.

`Complete` means the agreed exit evidence for the current execution gate is merged. `In progress` means useful slices are merged but the broader phase exit gate is still open. `Foundation present` means product functionality exists, but the phase still lacks its final operational or UX evidence. Percentages are planning estimates, not CI measurements.

## Current decision

**T004, T005, and T006 are complete for their current execution gates. T007 is in progress.** T007 now has the staging isolation contract, E2E/performance matrix foundation, Closed Beta operating pack, beta issue-log and Go/No-Go templates, staging activation checklist, runtime-proof template, and a dedicated Neon staging branch. T007 is not complete because a stable Vercel runtime has not yet been activated with `staging` identity/config bound to the isolated staging database, staging runtime/performance proof has not been recorded, and the 5-10 business Closed Beta has not run.

The next executable T007 step is **activate and prove the isolated staging runtime when Vercel environment configuration/build capacity is available**, then run staging health/E2E/performance/rollback evidence before any real beta participant enrollment. T008 remains blocked until T007 exit evidence and an explicit Go/No-Go decision exist.

## Product delivery P0-P12

| Phase | Status | Estimate | Merged evidence | Exit still required |
|---|---|---:|---|---|
| P0 Baseline and governance | In progress | 90% | architecture plan, environment guards, governed task/PR workflow, tracker and closeout records | keep task/PR/gate links current and reconcile later launch evidence |
| P1 Loyalty and financial rules | Complete | 100% | PRs #7-#10 and reversal/ledger PRs through #30 | reopen only for an approved policy change |
| P2 Ledger integrity | Complete | 100% | durable idempotency, reversals, locking, unlock provenance/restoration, exception handling, gross/net reporting, reconciliation implementation and T002 verification | read-only/no-automatic-repair constraint preserved |
| P3 Account and authentication | Complete | 100% | secure password reset, self-service password change, logout-everywhere PR #42, pending-owner lifecycle PR #43, Owner Invitation PR #44, Email Verification PR #46, Super Admin MFA PR #47, distributed auth rate limiting PR #48, Security Notifications PR #49 | reopen only for an approved authentication/security policy change |
| P4 Database and operations | In progress | 88% | environment isolation, guarded disposable restore evidence, production recovery posture, monitoring proof, runbooks, T004 closeout, dedicated T007 Neon staging branch | measured production/service RPO/RTO remains deferred to public-launch gate; staging runtime binding still pending |
| P5 Architecture boundaries | In progress | 30% | PR #36 workspace skeleton; PR #37 first pure domain extraction | additional domain/contracts/validation slices, then API reads and safe writes |
| P6 UX, design system, languages | In progress | 72% | shared UI foundations, T005 canonical AR/EN compatibility source, SSR direction handling, bilingual T006 public/onboarding flows | broader authenticated-surface parity, accessibility/device gate and later modernization work |
| P7 Marketing website | In progress | 82% | bilingual public homepage, localized SEO, supported `/get-started` conversion selector and browser UAT through PR #59 | analytics/measurement intentionally deferred to public-launch gate; later launch acquisition policy |
| P8 Business onboarding | Complete | 100% | invitation and draft foundations, bilingual owner onboarding, inline validation, supported path selection, live Standard Card preview and bounded browser UAT | reopen only for approved onboarding/product-policy changes |
| P9 Role experiences | Foundation present | 75% | Super Admin, Owner, Staff/Scan, Customer Card, reports and permissions | shell/navigation cleanup, role parity, broader mobile/browser UAT |
| P10 Staging and Closed Beta | In progress | 65% | PR #61 staging isolation contract; PR #62 E2E/performance matrix foundation; PR #63 Closed Beta operating pack, activation checklist and dedicated Neon staging branch | activate stable staging runtime, bind isolated staging data/config, record health/E2E/performance/rollback proof, run 5-10 business beta and explicit Go/No-Go |
| P11 Public-launch readiness | Foundation present | 35% | reset email, Email Verification, mandatory Super Admin MFA, distributed auth rate limiting, Security Notifications, plan/billing foundations, release and health scripts | signup/legal/data lifecycle, measured production recovery, analytics decision, subscription/payment lifecycle and rollback rehearsal |
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
| P6 API foundation | Not started | blocked by later auth-topology, staging/API-hosting and sequencing decisions. |
| P7-P10 Reads, writes, ledger cutover, web DB removal | Not started | must execute in order with parity, tenant, idempotency, concurrency and rollback gates. |
| P11-P20 UX and product vertical migration | Foundation present | substantial product UI exists and T006 improves public/onboarding parity, but target API/i18n modernization is incomplete. |
| P21-P25 hardening, QA, staging, cutover, cleanup | In progress foundation | T007 isolation/E2E/beta operating foundations are merged, but stable staging runtime proof, active beta evidence and eventual cutover evidence remain open. |

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
