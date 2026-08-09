# T007 Isolated Staging and Closed Beta Audit

Date: 2026-08-09
Base: `main` after merged PR #60 (`e94d94c6b252382ae0a8e83284bd483f2e5002c8`)

## Goal

Establish the smallest safe path from the current merged product to an isolated non-production staging environment, reproducible staging gates, and a controlled 5-10 business Closed Beta with an issue log and explicit Go/No-Go decision.

## Current evidence

- T004 established Preview isolation/runtime identity evidence, external monitoring evidence, recovery runbooks, and disposable-local restore evidence without running Production DB commands.
- T006 established the public marketing/conversion path, bilingual owner onboarding, live card preview, and bounded public browser UAT.
- Latest T006 local evidence recorded before closeout: 784/784 unit/contract tests passing, TypeScript passing, ESLint 0 errors with two pre-existing warnings, and targeted public Playwright UAT 3/3 passing.
- Vercel project audit on 2026-08-09 shows the `loyalflow` project is connected and recent Preview deployments are currently `READY`.
- The latest observed Preview deployment for the T006 closeout branch is `READY` and branch-scoped; recent T006 feature/test branches also have `READY` Preview deployments.
- A recent `main` deployment is also `READY` and targeted as Production. This audit does not modify or redeploy Production.

## T007 exit matrix

| Required T007 evidence | Current status | Next safe action |
|---|---|---|
| isolated staging environment | Partial foundation only | prove a dedicated staging identity/config/data boundary distinct from Production and ordinary PR Preview |
| staging quality gates | Partial foundation only | define and run typecheck, lint, unit/contracts, build, targeted browser E2E, health/smoke, and recovery checks against staging |
| staging database isolation | Not yet proven for T007 | read-only inventory first; any DB connection, branch creation, migration, seed, reset, or data mutation requires explicit approval |
| monitoring/rollback readiness | Foundation present from T004 | bind staging checks to the existing monitoring/runbook model and record a staging rollback rehearsal |
| 5-10 business Closed Beta | Not started | prepare participant criteria, onboarding script, feedback/issue log, severity rules, and exit criteria before inviting anyone |
| issue log and triage | Not started | create a bounded beta issue-log template with owner/severity/status/reproduction fields |
| Go/No-Go decision | Not started | require explicit decision after staging gates and beta evidence; never infer launch readiness from code tests alone |

## Critical distinction

Vercel Preview availability is useful evidence but does not by itself satisfy the T007 staging gate. T007 needs a stable, intentionally isolated non-production environment with a known identity, controlled configuration/data boundary, repeatable gates, and a beta operating procedure. A transient PR Preview is not automatically treated as staging.

## Approval boundaries

The following remain approval-gated and are not authorized by this audit:

- creating or changing staging/Production environment variables or secrets;
- connecting to any database or running SQL/Prisma commands;
- creating a database branch, schema, migration, seed, reset, backfill, or customer-like dataset;
- deploying to Production;
- changing dependencies/lockfiles;
- inviting real beta businesses or processing real participant/customer data before the beta operating rules are accepted.

## Recommended first implementation slice

Create a provider-neutral staging contract and automated readiness checks that verify environment identity and fail closed if staging is accidentally pointed at Production. This can be implemented without touching a live database or Production. After that code/config slice passes local and Preview gates, the next protected step is provisioning the actual staging data/config boundary with explicit approval.

## Current status

`READY FOR IMPLEMENTATION — STAGING CONTRACT SLICE`

No Production deploy, DB command, migration, dependency change, or environment mutation was performed by this audit.