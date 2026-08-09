# T007 Staging Contract Verification — 2026-08-09

Branch: `docs/t007-staging-beta-audit`
Verified runtime/test/config head: `a88d87d7669ef2ae06dc163b5bf2a58fa6d00744`

## Local verification

The accountable owner supplied the complete local verification log for the exact implementation head above.

- `pnpm run typecheck`: PASS.
- `pnpm run lint`: PASS with 0 errors and 2 pre-existing warnings in `app/account/security/actions.ts` for unused `_previousState` and `_formData` parameters.
- `pnpm test`: PASS — 790/790 tests, 0 failures.
- T007-specific behavioral coverage passed for:
  - explicit staging identity on a Vercel Preview host;
  - refusal of a staging identity on a Vercel Production host;
  - fail-closed behavior when expected staging database identity is missing;
  - rejection of Production database identity;
  - acceptance only of the explicitly expected non-production staging database;
  - no staging-only contract imposed outside staging.
- Prisma Client generation: PASS — Prisma Client 7.9.0.
- Next.js production build: PASS — Next.js 16.2.11 (webpack).
- Compilation: PASS — 59s.
- Build TypeScript phase: PASS — 41s.
- Page-data collection: PASS — 3.5s.
- Static generation: PASS — 26/26 pages in 7.5s.
- Build traces/finalization: PASS — 14.5s.

The build used only the process-scoped `NEXT_PUBLIC_APP_URL=https://loyalflow-gray.vercel.app` override.

## Scope and safety

This verification did not execute database commands, migrations, schema changes, seed/backfill/reset work, production deployment, staging deployment, provider configuration mutation, secret changes, dependency changes, or lockfile changes.

The staging isolation logic is fail-closed: staging readiness is not allowed unless the runtime identifies itself as staging and the connected database identity exactly matches the explicitly expected staging database while remaining distinct from the configured Production database identity.

## External provider status

Vercel attempted builds on this branch but the account remains blocked by the build-rate limit. No Vercel Preview/Staging build pass is claimed from that status.

## Slice status

`READY FOR DRAFT PR`

This evidence closes the code/config contract slice only. T007 as a whole still requires provider-side isolated staging configuration and runtime proof, E2E/performance evidence as applicable, Closed Beta with 5-10 businesses, issue log, and Go/No-Go evidence.
