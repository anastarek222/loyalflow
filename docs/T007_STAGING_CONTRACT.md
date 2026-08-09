# T007 Isolated Staging Contract

Date: 2026-08-09
Branch: `docs/t007-staging-beta-audit`

## Goal

Establish a deterministic application-level staging identity and fail-closed database-isolation contract before any provider environment mutation or Closed Beta activity.

## In scope

- Allow `LOYALFLOW_ENVIRONMENT=staging` to run on a Vercel Preview host without being misclassified as an identity conflict.
- Keep `staging` distinct from generic `preview` in public release metadata.
- Require an explicit expected staging database identity before a staging deployment can report ready.
- Refuse readiness when the connected database matches the known Production database identity or does not match the expected staging identity.
- Reuse the existing `/api/health` database readiness probe and return `503 unavailable` when the staging isolation guard fails.
- Add behavioral tests for compatible/incompatible host identity and fail-closed database matching.

## Non-goals

- No Vercel environment-variable mutation.
- No Neon/provider configuration mutation.
- No database command, migration, schema change, seed, reset, backfill, or customer-data access.
- No Production deployment.
- No dependency or lockfile change.
- No Closed Beta participant enrollment yet.

## Provider activation dependency

A real staging environment will later need an explicitly approved provider configuration with at least:

- `LOYALFLOW_ENVIRONMENT=staging`
- a staging-only `DATABASE_URL`
- `LOYALFLOW_STAGING_DATABASE` equal to the actual staging database name
- `LOYALFLOW_PRODUCTION_DATABASE` retaining the Production database identity for collision refusal

Setting or changing those provider values remains a separate approval-gated action. This slice only makes the application fail closed until the contract is satisfied.

## Exit evidence for this slice

- Typecheck passes.
- ESLint passes with no new errors.
- Full unit/contract suite passes.
- Production build passes.
- T007 staging-isolation behavioral tests pass.
- A Vercel Preview build may be observed, but it does not become named staging evidence until the approved staging provider configuration exists and `/api/health` reports `environment: "staging"` and `status: "ready"`.
