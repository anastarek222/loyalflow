# LoyalFlow Master Delivery Tracker

Last verified: 2026-08-09

Baseline: `main` at `79537d04eecbc037cadeec359e06b8281c3991f9` (merged PR #51)

Latest merged quality evidence: T005 I18N compatibility foundation passed TypeScript,
ESLint, 759/759 tests, Prisma Client generation, and a Next.js 16.2.11 production build
with 25/25 static pages generated. Vercel did not provide an independent Preview build pass
because the account hit its build-rate limit. T005 merged under an explicit owner-approved
governance exception because no independent reviewer was available. No database, migration,
dependency, auth-topology, or production-deploy change was part of T005.

## How to use this tracker

This file joins two different planning views without treating them as interchangeable:

- **Product delivery P0-P12** tracks whether LoyalFlow is safe, usable, operable, and
  sellable.
- **Modernization P0-P25** tracks the internal architecture migration from the current
  Next.js monolith toward domain/API ownership.

`Complete` means the agreed exit evidence is merged. `In progress` means useful slices
are merged but the phase exit gate is still open. `Foundation present` means product
functionality exists, but the phase still lacks its final operational or UX evidence.
Percentages are planning estimates, not CI measurements.

## Current decision

**T005 — I18N compatibility foundation is complete and merged in PR #51.** LoyalFlow now
has a bounded EN/AR locale foundation, typed bilingual catalog with key parity, English
fallback, SSR locale resolution, root language/direction wiring, a bounded language switcher,
and a first localized login entrypoint. Legacy `lib/i18n.ts` remains only as a compatibility
adapter over the typed catalog.

**T004 — Operational readiness closeout remains open on its separate branch.** The technical
quality work and monitoring evidence were completed there, but the independent-review
governance gate was not satisfied and that branch has not been merged. The next executable
priority is to return to T004, reconcile it with the current `main` after PR #51, and either
obtain a valid independent review or record a new explicit owner-approved governance exception
before any T004 merge. Modernization continues in small, compatible slices; no web/API split
or critical ledger cutover is authorized yet.

## Product delivery P0-P12

| Phase | Status | Estimate | Merged evidence | Exit still required |
|---|---|---:|---|---|
| P0 Baseline and governance | In progress | 84% | architecture plan, environment guards, migration CI, unified tracker, explicit T005 governance-exception record | keep task/PR/gate links current and restore independent-review coverage where available |
| P1 Loyalty and financial rules | Complete | 100% | PRs #7-#10 and reversal/ledger PRs through #30 | reopen only for an approved policy change |
| P2 Ledger integrity | Complete | 100% | durable idempotency, reversals, locking, unlock provenance/restoration, exception handling, gross/net reporting, reconciliation implementation, T002 verification | Verification complete; read-only/no-automatic-repair constraint preserved |
| P3 Account and authentication | Complete | 100% | secure password reset, self-service password change, logout-everywhere PR #42, pending-owner lifecycle PR #43, Owner Invitation PR #44, Email Verification PR #46, Super Admin MFA PR #47, distributed auth rate limiting PR #48, Security Notifications PR #49 | reopen only for an approved authentication/security policy change |
| P4 Database and operations | In progress | 70% | environment identity, 46-migration manifest, destructive scan, disposable PostgreSQL CI, provider retention/PITR verification, health monitoring and alert-delivery evidence on T004 branch | merge/reconcile T004 closeout evidence; measured service RPO/RTO remains deferred to launch gate |
| P5 Architecture boundaries | In progress | 30% | PR #36 workspace skeleton; PR #37 first pure domain extraction | additional domain/contracts/validation slices, then API reads and safe writes |
| P6 UX, design system, languages | In progress | 68% | shared UI foundations, PR #51 typed EN/AR catalog, parity/fallback, SSR lang/dir, RTL/LTR and login switcher | extend catalog coverage, bidi/state/a11y validation, responsive/device/browser UAT |
| P7 Marketing website | Foundation present | 15% | auth entry surfaces and initial identity | public marketing routes, SEO, analytics, demo/trial conversion |
| P8 Business onboarding | Foundation present | 50% | custom/invitation foundations, draft flow, presets, loyalty configuration | complete path selection, inline errors, live card preview, reviewed presets and artwork policy |
| P9 Role experiences | Foundation present | 75% | Super Admin, Owner, Staff/Scan, Customer Card, reports and permissions | shell/navigation cleanup, role parity, mobile and browser UAT |
| P10 Staging and Closed Beta | In progress | 35% | strong unit/contracts, real PostgreSQL tests, Vercel previews, Preview resource isolation evidence on T004 branch | merged isolated-staging gate, E2E/performance matrix, backup evidence, 5-10 business beta and Go/No-Go |
| P11 Public-launch readiness | Foundation present | 34% | reset email, Email Verification, mandatory Super Admin MFA, distributed auth rate limiting, Security Notifications, plan/billing foundations, release and health scripts, monitoring evidence on T004 branch | signup, legal/data lifecycle, measured recovery evidence, subscription lifecycle, payment and rollback rehearsal |
| P12 Post-launch scale | Deferred | 15% | offers, referrals, campaigns, rewards, multi-branch, events foundations | only demand-driven workers, webhooks, API keys, POS, wallet/tiers and physical service split |

## Modernization P0-P25

| Range | Status | Evidence / blocker |
|---|---|---|
| P0 Governance | Complete | PRs #4-#5 establish the governed baseline and environment/database guards; T005 governance exception is explicitly recorded rather than silently treated as an independent review. |
| P1 Product rules | Complete | PR #7 plus rule-protection and ledger implementation slices. |
| P2 DB/migration hardening | In progress | PR #6 and #34 protect the reviewed migration history; Owner Invitation, Email Verification, Super Admin MFA, and Security Notifications bring the committed manifest to 46 migrations. Backup/restore procedure, RPO/RTO runbook, guard, and verification wrapper are present; measured service recovery evidence remains deferred and T004 has not merged. |
| P3 Workspace foundation | Complete | PR #36; root Next.js runtime remains authoritative. |
| P4 Domain/contracts | In progress | PR #37 moves `calculateRewardProgress` to `@loyalflow/domain` with a compatibility re-export; G05 remains open for broader typed-contract evidence and owner review. |
| P5 I18N foundation | Foundation present | PR #51 adds bounded EN/AR locale config, typed catalog/key parity, fallback, SSR lang/dir, RTL/LTR, login localization and a compatibility adapter. Broader route/catalog coverage and accessibility/browser evidence remain. |
| P6 API foundation | Not started | blocked by auth-topology decision, staging/API-hosting decisions, and additional contract-boundary work. |
| P7-P10 Reads, writes, ledger cutover, web DB removal | Not started | must execute in order with parity, tenant, idempotency, concurrency, and rollback gates. |
| P11-P20 UX and product vertical migration | Foundation present | much product UI exists; PR #51 establishes the compatible i18n direction, but most product routes are not yet migrated to the typed catalog/target API architecture. |
| P21-P25 hardening, QA, staging, cutover, cleanup | Not started | requires prior API migration, observability, restore, UAT and production-cutover evidence. |

## Executable queue

| ID | Work item | State | Scope boundary | Required exit evidence |
|---|---|---|---|---|
| T001 | Create unified master tracker | Complete | documentation only | merged in PR #38 |
| T002 | Ledger reconciliation | Completed | read-only calculation/reporting; no automatic repair and no production execution | ran merged command against isolated test database: environment=test, scannedCustomers=1, matchingCustomers=1, mismatchCount=0, reportedMismatchCount=0, reportTruncated=false, mismatches=[] |
| T003 | Authentication closeout | Completed | account/session security only; no auth-topology rewrite | merged through PR #49: password lifecycle, session revocation, owner invitation, email verification, mandatory Super Admin MFA, distributed auth rate limiting, and account-scoped security notifications; latest authentication gates 751/751 + typecheck + lint 0 errors |
| T004 | Operational readiness closeout | In progress — governance blocked | backup/restore, RPO/RTO, isolation, monitoring and runbooks | reconcile T004 branch with current main; independent review or explicit new governance exception before merge; measured RPO/RTO remains a launch gate |
| T005 | I18N compatibility foundation | Completed | compatibility-first EN/AR foundation; no mass copy rewrite | merged PR #51; typed catalog parity/fallback, SSR lang/dir, RTL/LTR, bounded switcher/login slice; 759/759 + typecheck + lint + production build |
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
4. Never record secrets, customer data, production connection strings, or disposable
   test credentials here.
5. Do not delete legacy paths until parity, zero callers, observation, and rollback
   compatibility are all recorded.
