# LoyalFlow Beta Closeout Overlay — 2026-08-18

Status: `CORE_BETA_ENGINEERING_CLOSED_RUNTIME_PROOF_PENDING`

Execution environment: isolated `staging` / Beta only.

Production remains forbidden without a later explicit authorization.

## Purpose

This overlay clarifies the handoff between the current Beta engineering phase and the next Final Product / Frontend phase. It does not erase historical TC/TR/TCR evidence and does not redefine deferred commercial or Production gates as complete.

The governing distinction is:

- **Core Beta engineering**: source correctness, boundaries, functional behavior, CI, localization/accessibility baseline, and bounded synthetic/runtime readiness.
- **Runtime proof**: exact-SHA Staging deployment and automated browser certification for the current source.
- **Real Closed Beta**: 5–10 real businesses, issue disposition, and explicit Product Owner Go/No-Go.
- **Final Product / Commercial**: final UI/UX and brand decisions, pricing/packaging, signup/trial policy, payments, legal, analytics policy, and Production readiness.

## Current classification

### Closed / decided for the current Beta engineering gate

- Consolidated P1/P2 cleanup and source-of-truth cleanup.
- Subscription lifecycle and entitlement foundations required by the current Beta contract.
- Durable integration outbox / queue / retry / reconciliation foundations and Staging recovery proof.
- Authentication, tenant, role, session, recovery/verification source boundaries required for Beta.
- AR/EN functional localization baseline and RTL/LTR support on governed surfaces.
- Settings, Customers, Branches, Team, Reports, Playbooks, Notifications, and Program source-side cleanup captured by Issue #206 continuation evidence.
- Custom Card source lifecycle: private front/back upload, immutable versions, preview, explicit publish, token-bound public delivery, geometry validation, and automated browser coverage including front/back flip.
- Slice D browser runner source/readiness and secure automation-handoff hardening.

Classification: `CORE_BETA_ENGINEERING_CLOSED`.

### Pending runtime proof — not a source defect

The current `staging` source head is `9bc3209ae4bcc3e275acb1c3dbfb8a9ffe17ed57`.

A local Vercel CLI attempt from the exact source reached the platform deployment quota and returned `api-deployments-free-per-day` (more than 100 deployments). The `staging` Preview scope has the required `DATABASE_URL` and other branch-scoped Beta environment variables; the remaining blocker is the Vercel account deployment quota, not a known repository regression.

The exact-SHA automated browser/runtime matrix remains required before claiming full technical runtime closure. Older READY deployments must not be reused as evidence for the current SHA.

Classification: `TR_PENDING_EXTERNAL_VERCEL_QUOTA`.

### Intentionally deferred

- Manual browser certification remains intentionally deferred under the current Product decision; automated exact-SHA browser UAT remains the technical runtime gate.
- 5–10 real-business Closed Beta and human Go/No-Go remain `DEFERRED_REAL_CLOSED_BETA` until the Product Owner schedules that phase.
- Final card visual policy / pixel-perfect presentation, final Design System rollout, final dashboard visual hierarchy, and final UI/UX polish belong to the next Final Product / Frontend phase. Functional card behavior and safe geometry are not deferred.
- Self-service signup, trial/tenant bootstrap, pricing/packaging, payment provider/checkout/renewal, legal-consent lifecycle, analytics policy, and public-launch activation remain Product/Commercial decisions.
- Production migrations, domains, Production secrets, monitoring/alerts, measured restore proof, release promotion, and launch approval remain Production-readiness gates.

## Transition rule

The project may now proceed with **Final Product / Frontend finalization on Beta/Staging** without reopening completed Core Beta engineering slices.

Any newly discovered defect that affects correctness, tenant isolation, authorization, financial/loyalty integrity, Custom Card functional behavior, RTL/mobile usability baseline, or security must be classified back into a bounded TC/TR/TCR fix. Pure presentation, information architecture, brand, density, chart styling, and interaction polish belong to the Final Product / Frontend phase.

## Next execution sequence

1. Final Product / Frontend Design System and shell.
2. Core product surfaces: Dashboard, Customers, Cards/Custom Card, Rewards/Offers, Team/Branches.
3. Reports, Playbooks, Settings, Billing/Subscription presentation, integrations.
4. Responsive, RTL/LTR, keyboard/accessibility, empty/error/loading-state polish.
5. When Vercel quota allows: one fresh exact-SHA `staging` Preview and automated Slice D runtime certification.
6. Governed real-business Closed Beta when explicitly scheduled.
7. Commercial/Legal/Payments activation and later Production readiness under separate authorization.

## Non-authorizations

This overlay does not authorize Production, schema/migration changes, provider activation, credential/secret changes, payment activation, or synthetic substitution for real-business evidence.
