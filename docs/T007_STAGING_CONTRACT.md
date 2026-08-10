# T007 Isolated Staging Contract

Date: 2026-08-10
Branch: `fix/t007-staging-database-host-isolation`

## Goal

Establish a deterministic application-level staging identity and fail-closed database endpoint-host isolation contract before any provider environment mutation or Closed Beta activity.

## In scope

- Allow `LOYALFLOW_ENVIRONMENT=staging` to run on a Vercel Preview host without being misclassified as an identity conflict.
- Keep `staging` distinct from generic `preview` in public release metadata.
- Require explicit expected Staging and Production database endpoint hosts before a staging deployment can report ready.
- Extract the connected endpoint hostname from the server-only `DATABASE_URL` and refuse readiness when it matches Production or does not match Staging.
- Normalize host identity by trimming whitespace, lowercasing, removing one trailing dot, and treating a `-pooler` suffix in the first Neon-style `ep-` DNS label as equivalent to the direct endpoint. A `-pooler` substring in any other position is not removed.
- Reuse the existing `/api/health` read-only `SELECT 1` database readiness probe and return `503 unavailable` when the staging isolation guard fails.
- Keep failure reasons specific but secret-free. Hostnames and connection strings are never returned or logged.
- Add behavioral tests for compatible/incompatible endpoint identity and fail-closed host matching.

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
- `LOYALFLOW_STAGING_DATABASE_HOST` equal to the Staging endpoint host
- `LOYALFLOW_PRODUCTION_DATABASE_HOST` equal to the Production endpoint host for collision refusal

`DATABASE_URL` is a secret. It must remain server-only and must never be returned, printed, or logged. The host variables are configuration identities, but the guard and health endpoint still do not expose their values.

`LOYALFLOW_PRODUCTION_DATABASE` remains a separate F19 database-name guard and is not part of the T007 endpoint-host comparison.

Setting or changing those provider values remains a separate approval-gated action. This slice only makes the application fail closed until the contract is satisfied.

## Exit evidence for this slice

- Typecheck passes.
- ESLint passes with no new errors.
- Full unit/contract suite passes.
- Production build passes.
- T007 staging-isolation behavioral tests pass.
- A Vercel Preview build may be observed, but it does not become named staging evidence until the approved staging provider configuration exists and `/api/health` reports `environment: "staging"` and `status: "ready"`.
