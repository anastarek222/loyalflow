# LoyalFlow Master Delivery Tracker

Last verified: 2026-08-09

Baseline: `main` at `9889059` (merged PR #50)

Latest merged authentication-slice verification: 751/751 tests, TypeScript, full ESLint with 0 errors
and 2 pre-existing warnings, and Prisma Client generation all passing for the Security
Notifications slice. T004 branch evidence now additionally includes a successful disposable-local
PostgreSQL backup/restore exercise, verified Preview isolation/runtime identity, a rehearsed
incident/rollback tabletop, and verified external uptime alert delivery. These T004 facts are branch
evidence and are not yet merged. Production/service RPO/RTO remain unverified, and no production
database migration, backup, restore, or schema operation was executed by the T004 slice.

## How to use this tracker

This file joins two different planning views without treating them as interchangeable:

- **Product delivery P0-P12** tracks whether LoyalFlow is safe, usable, operable, and
  sellable.
- **Modernization P0-P25** tracks the internal architecture migration from the current
  Next.js monolith toward domain/API ownership.

`Complete` means the agreed exit evidence is merged. `In progress` means useful slices
are merged or recorded on the active governed task branch but the phase exit gate is still open.
`Foundation present` means product functionality exists, but the phase still lacks its final
operational or UX evidence. Percentages are planning estimates, not CI measurements.

## Current decision

**T004 — Operational readiness closeout is in progress.** The active branch has recorded a
successful guarded disposable-local backup/restore drill, Preview database/environment isolation,
application-level Preview identity, named primary operational ownership including Recovery Operator,
a bounded incident/application-rollback tabletop, and external `/api/health` uptime monitoring with
verified DOWN and UP/recovery notification delivery to the accountable On-call Operator. Remaining
closeout items are production/service RPO/RTO evidence or an explicitly accepted launch posture,
Independent Reviewer assignment/review, continuity/back-up ownership resolution, and latest-head
quality gates. Modernization continues in small, compatible slices; no web/API split or critical
ledger cutover is authorized yet.

## Product delivery P0-P12

| Phase | Status | Estimate | Merged / active-branch evidence | Exit still required |
|---|---|---:|---|---|
| P0 Baseline and governance | In progress | 82% | architecture plan, environment guards, migration CI, this tracker | keep task/PR/gate links current |
| P1 Loyalty and financial rules | Complete | 100% | PRs #7-#10 and reversal/ledger PRs through #30 | reopen only for an approved policy change |
| P2 Ledger integrity | Complete | 100% | durable idempotency, reversals, locking, unlock provenance/restoration, exception handling, gross/net reporting, reconciliation implementation, T002 verification | Verification complete; read-only/no-automatic-repair constraint preserved |
| P3 Account and authentication | Complete | 100% | secure password reset, self-service password change, logout-everywhere PR #42, pending-owner lifecycle PR #43, Owner Invitation PR #44, Email Verification PR #46, Super Admin MFA PR #47, distributed auth rate limiting PR #48, Security Notifications PR #49 | reopen only for an approved authentication/security policy change |
| P4 Database and operations | In progress | 82% | environment identity, 46-migration manifest, destructive scan, guarded disposable PostgreSQL recovery drill, Preview isolation/runtime identity, operational ownership, tabletop rehearsal, external `/api/health` monitor with verified DOWN/UP notification delivery | production/service RPO/RTO posture, Independent Reviewer, continuity/back-up ownership, latest-head gates and closeout review |
| P5 Architecture boundaries | In progress | 30% | PR #36 workspace skeleton; PR #37 first pure domain extraction | additional domain/contracts/validation slices, then API reads and safe writes |
| P6 UX, design system, languages | Foundation present | 55% | shared UI foundations, partial AR/EN and RTL, responsive operational flows | one i18n source, key parity, bidi, state library, full accessibility/device gate |
| P7 Marketing website | Foundation present | 15% | auth entry surfaces and initial identity | public marketing routes, SEO, analytics, demo/trial conversion |
| P8 Business onboarding | Foundation present | 50% | custom/invitation foundations, draft flow, presets, loyalty configuration | complete path selection, inline errors, live card preview, reviewed presets and artwork policy |
| P9 Role experiences | Foundation present | 75% | Super Admin, Owner, Staff/Scan, Customer Card, reports and permissions | shell/navigation cleanup, role parity, mobile and browser UAT |
| P10 Staging and Closed Beta | In progress | 35% | strong unit/contracts, real PostgreSQL tests, isolated Vercel Preview path and non-production Neon resource | full staging gate, E2E/performance matrix, production-grade recovery evidence, 5-10 business beta and Go/No-Go |
| P11 Public-launch readiness | Foundation present | 38% | reset email, Email Verification, mandatory Super Admin MFA, distributed auth rate limiting, Security Notifications, external uptime alert route, plan/billing foundations, release and health scripts | signup, legal/data lifecycle, production backup/RPO-RTO, subscription lifecycle, payment and final release gate |
| P12 Post-launch scale | Deferred | 15% | offers, referrals, campaigns, rewards, multi-branch, events foundations | only demand-driven workers, webhooks, API keys, POS, wallet/tiers and physical service split |

## Modernization P0-P25

| Range | Status | Evidence / blocker |
|---|---|---|
| P0 Governance | Complete | PRs #4-#5 establish the governed baseline and environment/database guards. |
| P1 Product rules | Complete | PR #7 plus rule-protection and ledger implementation slices. |
| P2 DB/migration hardening | In progress | PR #6 and #34 protect the reviewed migration history; Owner Invitation, Email Verification, Super Admin MFA, and Security Notifications bring the committed manifest to 46 migrations. The guarded disposable-local backup/restore drill now has measured repeat evidence (95 ms backup, 53 ms restore, validated synthetic restore), closing the former local G02 execution-evidence gap. Production/service RPO/RTO remain unverified and are not inferred from local timings. |
| P3 Workspace foundation | Complete | PR #36; root Next.js runtime remains authoritative. |
| P4 Domain/contracts | In progress | PR #37 moves `calculateRewardProgress` to `@loyalflow/domain` with a compatibility re-export; G05 remains open for broader typed-contract evidence and owner review. |
| P5 I18N foundation | Not started | next modernization slice after current product-safety closeout. |
| P6 API foundation | Not started | blocked by P5, auth-topology decision, and staging/API-hosting decisions. |
| P7-P10 Reads, writes, ledger cutover, web DB removal | Not started | must execute in order with parity, tenant, idempotency, concurrency, and rollback gates. |
| P11-P20 UX and product vertical migration | Foundation present | much product UI exists, but it is not yet bound to the target API/i18n architecture. |
| P21-P25 hardening, QA, staging, cutover, cleanup | Not started | requires prior API migration, observability, restore, UAT and production-cutover evidence. |

## Executable queue

| ID | Work item | State | Scope boundary | Required exit evidence |
|---|---|---|---|---|
| T001 | Create unified master tracker | Complete | documentation only | merged in PR #38 |
| T002 | Ledger reconciliation | Completed | read-only calculation/reporting; no automatic repair and no production execution | ran merged command against isolated test database: environment=test, scannedCustomers=1, matchingCustomers=1, mismatchCount=0, reportedMismatchCount=0, reportTruncated=false, mismatches=[] |
| T003 | Authentication closeout | Completed | account/session security only; no auth-topology rewrite | merged through PR #49: password lifecycle, session revocation, owner invitation, email verification, mandatory Super Admin MFA, distributed auth rate limiting, and account-scoped security notifications; latest merged local gates 751/751 + typecheck + lint 0 errors |
| T004 | Operational readiness closeout | In progress | backup/restore, RPO/RTO, isolation, monitoring and runbooks | local restore evidence recorded; Preview isolation verified; external alert delivery verified; primary operational owners named; still requires production/service RPO/RTO posture, Independent Reviewer/review, continuity ownership and latest-head gates |
| T005 | I18N compatibility foundation | Queued | one small catalog/adapter slice; no mass copy rewrite | AR/EN parity, fallback, SSR/RTL/a11y and bundle evidence |
| T006 | Marketing and onboarding completion | Queued | public website and owner setup; no payment cutover | conversion routes, SEO/analytics, inline validation, live preview and browser UAT |
| T007 | Isolated staging and Closed Beta | Blocked | non-production only | staging gates, 5-10 business beta, issue log and Go/No-Go |
| T008 | Public launch readiness | Blocked | signup/legal/billing/payment/release | G17/G20 evidence, rollback rehearsal and launch approval |

## Update rules

1. Update this file in the same PR that changes a phase status or closes an executable
   queue item.
2. Link merged PRs and reproducible checks; do not mark manual UAT, restore, staging, or
   production evidence complete from code tests alone.
3. A failed related check, incident, rollback, schema/contract change, or expired gate
   reopens the affected row.
4. Never record secrets, customer data, production connection strings, private notification
   addresses, or disposable test credentials here.
5. Do not delete legacy paths until parity, zero callers, observation, and rollback
   compatibility are all recorded.
