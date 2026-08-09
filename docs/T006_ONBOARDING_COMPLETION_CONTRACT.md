# T006 Onboarding Completion Slice Contract

## Goal
Close the next bounded T006 owner-onboarding UX gap on top of the merged marketing foundation without changing persistence, authentication topology, billing, or database state.

## In scope
- Reuse the merged T005 locale source and direction behavior.
- Improve owner onboarding presentation and validation messaging without creating a second writer.
- Preserve `saveOwnerOnboardingAction` and `launchOwnerOnboardingAction` as the authoritative existing write paths.
- Keep `/onboarding` OWNER-only, `PENDING`, unassigned-business scoped, and `noindex, nofollow`.
- Add behavioral/structural tests for the bounded UX changes.

## Out of scope
- No public self-service signup.
- No payment or subscription checkout/provider integration.
- No database schema, migration, seed, backfill, reset, or data command.
- No dependency or lockfile change.
- No production deployment or provider environment mutation.
- No authentication architecture change.
- No new onboarding persistence writer.

## Exit evidence for this slice
- Existing lifecycle and tenant/account guards remain intact.
- User-facing onboarding copy changed by this slice is bilingual from the canonical catalog or a compatibility-safe adapter.
- Validation feedback remains inline and accessible.
- Existing save/launch actions remain authoritative.
- Typecheck, lint, tests, and production build pass before PR readiness.
