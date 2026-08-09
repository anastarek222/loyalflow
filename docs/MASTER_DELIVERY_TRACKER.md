# LoyalFlow Master Delivery Tracker

Last verified: 2026-08-09

Baseline: `main` at `6319133a157d09aa1e5b04ddd5974b884736bd78` (merged PR #53)

Latest reconciliation verification: 762/762 tests, TypeScript, ESLint with 0 errors and 2 pre-existing warnings, Prisma Client generation, and a full Next.js 16.2.11 production build with 25/25 static pages all passed on the reconciled T004 runtime/test/config tree. Vercel status remains unavailable as a code signal because the account is blocked by the build-rate limit. No production deployment, production database command, migration execution, secret/environment mutation, or production recovery action was performed by the T004 reconciliation.

## How to use this tracker

This file joins two different planning views without treating them as interchangeable:

- **Product delivery P0-P12** tracks whether LoyalFlow is safe, usable, operable, and sellable.
- **Modernization P0-P25** tracks the internal architecture migration from the current Next.js monolith toward domain/API ownership.

`Complete` means the agreed exit evidence is merged. `In progress` means useful slices are merged but the phase exit gate is still open. `Foundation present` means product functionality exists, but the phase still lacks its final operational or UX evidence. Percentages are planning estimates, not CI measurements.

## Current decision

**T004 — Operational readiness closeout and T005 — I18N compatibility foundation are complete and merged.** T004 now has merged disposable-local recovery execution evidence, read-only Production recovery-posture evidence, isolated Preview evidence, external monitoring and alert-delivery evidence, named primary operational ownership, a tabletop rollback rehearsal, and reconciled quality-gate verification. Measured Production/service RPO and RTO remain explicitly unverified and deferred to the public-launch gate. The T004 Independent Review requirement was closed only by an explicit T004-specific governance exception from the accountable owner because no real independent reviewer was available.

T005 is merged through PR #51 with one typed EN/AR catalog source, legacy compatibility adapter, locale-cookie SSR resolution, deterministic LTR/RTL direction, and localized login entrypoint foundations. Its latest verified slice passed 759/759 tests, typecheck, lint, and production build before merge.

The next executable queue item is **T006 — Marketing and onboarding completion**. Modernization continues in small compatible slices; no web/API split, critical ledger cutover, production database migration, or production deployment is authorized by this tracker.

## Product delivery P0-P12

| Phase | Status | Estimate | Merged evidence | Exit still required |
|---|---|---:|---|---|
| P0 Baseline and governance | In progress | 86% | architecture plan, environment guards, migration CI, tracker governance, recorded T004/T005 exceptions | keep task/PR/gate links current and avoid normalizing governance exceptions |
| P1 Loyalty and financial rules | Complete | 100% | PRs #7-#10 and reversal/ledger PRs through #30 | reopen only for an approved policy change |
| P2 Ledger integrity | Complete | 100% | durable idempotency, reversals, locking, unlock provenance/restoration, exception handling, gross/net reporting, reconciliation implementation, T002 verification | verification complete; read-only/no-automatic-repair constraint preserved |
| P3 Account and authentication | Complete | 100% | secure password reset, self-service password change, logout-everywhere PR #42, pending-owner lifecycle PR #43, Owner Invitation PR #44, Email Verification PR #46, Super Admin MFA PR #47, distributed auth rate limiting PR #48, Security Notifications PR #49 | reopen only for an approved authentication/security policy change |
| P4 Database and operations | In progress | 84% | environment identity, reviewed migration manifest, destructive scan, disposable PostgreSQL CI, T004 local restore execution, Production PITR posture, Preview isolation, external monitoring, tabletop rehearsal, named primary owners | measured Production/service RPO-RTO evidence remains deferred to launch; continuity redundancy still required before public launch |
| P5 Architecture boundaries | In progress | 30% | PR #36 workspace skeleton; PR #37 first pure domain extraction | additional domain/contracts/validation slices, then API reads and safe writes |
| P6 UX, design system, languages | Foundation present | 65% | shared UI foundations, PR #51 typed EN/AR catalog, compatibility adapter, SSR locale cookie, deterministic RTL/LTR login foundation, responsive operational flows | broader copy parity, bidi hardening, state library, full accessibility/device gate |
| P7 Marketing website | Foundation present | 15% | auth entry surfaces and initial identity | public marketing routes, SEO, analytics, demo/trial conversion |
| P8 Business onboarding | Foundation present | 50% | custom/invitation foundations, draft flow, presets, loyalty configuration | complete path selection, inline errors, live card preview, reviewed presets and artwork policy |
| P9 Role experiences | Foundation present | 75% | Super Admin, Owner, Staff/Scan, Customer Card, reports and permissions | shell/navigation cleanup, role parity, mobile and browser UAT |
| P10 Staging and Closed Beta | In progress | 45% | strong unit/contracts, real PostgreSQL tests, isolated Preview DB/runtime identity, external health monitoring | broader staging gates, E2E/performance matrix, 5-10 business beta and Go/No-Go |
| P11 Public-launch readiness | Foundation present | 42% | reset email, Email Verification, mandatory Super Admin MFA, distributed auth rate limiting, Security Notifications, plan/billing foundations, release/health scripts, T004 monitoring/recovery posture | signup, legal/data lifecycle, measured recovery objectives, subscription lifecycle, payment and rollback rehearsal |
| P12 Post-launch scale | Deferred | 15% | offers, referrals, campaigns, rewards, multi-branch, events foundations | only demand-driven workers, webhooks, API keys, POS, wallet/tiers and physical service split |

## Modernization P0-P25

| Range | Status | Evidence / blocker |
|---|---|---|
| P0 Governance | Complete | PRs #4-#5 establish the governed baseline and environment/database guards. T004/T005 governance exceptions are explicitly scoped and must not become the default workflow. |
| P1 Product rules | Complete | PR #7 plus rule-protection and ledger implementation slices. |
| P2 DB/migration hardening | In progress | reviewed migration protections remain in place; T004 now adds successful disposable-local backup/restore execution plus read-only Production recovery-posture evidence. Measured Production/service RPO-RTO remains intentionally unverified and deferred to the launch gate. |
| P3 Workspace foundation | Complete | PR #36; root Next.js runtime remains authoritative. |
| P4 Domain/contracts | In progress | PR #37 moves `calculateRewardProgress` to `@loyalflow/domain` with a compatibility re-export; G05 remains open for broader typed-contract evidence and owner review. |
| P5 I18N foundation | In progress | PR #51 merges the typed EN/AR catalog, legacy compatibility adapter, SSR locale resolver, locale cookie contract, and deterministic RTL/LTR login foundation; broader application copy parity and accessibility evidence remain. |
| P6 API foundation | Not started | still blocked by auth-topology and staging/API-hosting decisions plus completion of broader contract work. |
| P7-P10 Reads, writes, ledger cutover, web DB removal | Not started | must execute in order with parity, tenant, idempotency, concurrency, and rollback gates. |
| P11-P20 UX and product vertical migration | Foundation present | substantial product UI exists and the first i18n compatibility foundation is now merged, but broad target-architecture migration remains incomplete. |
| P21-P25 hardening, QA, staging, cutover, cleanup | Not started | requires prior API migration, observability, restore, UAT and production-cutover evidence. |

## Executable queue

| ID | Work item | State | Scope boundary | Required exit evidence |
|---|---|---|---|---|
| T001 | Create unified master tracker | Complete | documentation only | merged in PR #38 |
| T002 | Ledger reconciliation | Completed | read-only calculation/reporting; no automatic repair and no production execution | ran merged command against isolated test database: environment=test, scannedCustomers=1, matchingCustomers=1, mismatchCount=0, reportedMismatchCount=0, reportTruncated=false, mismatches=[] |
| T003 | Authentication closeout | Completed | account/session security only; no auth-topology rewrite | merged through PR #49: password lifecycle, session revocation, owner invitation, email verification, mandatory Super Admin MFA, distributed auth rate limiting, and account-scoped security notifications |
| T004 | Operational readiness closeout | Completed | backup/restore, RPO/RTO treatment, isolation, monitoring and runbooks | merged in PR #53 after 762/762 + typecheck + lint + build verification; local restore, Production recovery posture, Preview isolation, monitoring, ownership and tabletop evidence merged; Independent Review waived only by explicit T004 exception; achieved Production RPO/RTO remain unverified and deferred to launch |
| T005 | I18N compatibility foundation | Completed | one small catalog/adapter slice; no mass copy rewrite | merged in PR #51 with typed EN/AR parity, English request fallback, SSR locale cookie, deterministic RTL/LTR and login integration; latest verified slice 759/759 + typecheck + lint + build |
| T006 | Marketing and onboarding completion | Next | public website and owner setup; no payment cutover | conversion routes, SEO/analytics, inline validation, live preview and browser UAT |
| T007 | Isolated staging and Closed Beta | Blocked | non-production only | staging gates, 5-10 business beta, issue log and Go/No-Go |
| T008 | Public launch readiness | Blocked | signup/legal/billing/payment/release | measured recovery evidence, G17/G20 evidence, rollback rehearsal and launch approval |

## Update rules

1. Update this file in the same PR that changes a phase status or closes an executable queue item.
2. Link merged PRs and reproducible checks; do not mark manual UAT, restore, staging, or production evidence complete from code tests alone.
3. A failed related check, incident, rollback, schema/contract change, or expired gate reopens the affected row.
4. Never record secrets, customer data, production connection strings, or disposable test credentials here.
5. Do not delete legacy paths until parity, zero callers, observation, and rollback compatibility are all recorded.
6. A governance exception is task-specific and must never be inherited by another task unless the accountable owner explicitly approves a new exception.
