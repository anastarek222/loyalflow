# T006 Live Card Preview Slice

## Goal

Make the existing private Owner onboarding card preview react to the business and loyalty values the Owner is currently editing, without adding a second persistence path.

## In scope

- Reuse the existing `StandardCardSetup` / canonical Loyalty Card renderer.
- Preview current business name, logo, loyalty mode, unit, currency, reward name, and reward threshold while editing onboarding.
- Keep preview state presentation-only until the existing Save progress or Launch action is submitted.
- Add deterministic behavioral tests for preview-state normalization and updates.

## Non-goals

- No database, migration, schema, seed, backfill, or Production operation.
- No new save/launch writer or lifecycle change.
- No Custom Card permission expansion.
- No payment, signup, analytics provider, dependency, lockfile, secret, or environment mutation.
- No claim of browser UAT or full T006 closure from unit/build verification alone.

## Exit evidence

- Preview updates deterministically from supported onboarding fields.
- Existing `saveOwnerOnboardingAction` / `launchOwnerOnboardingAction` boundaries remain authoritative.
- Typecheck, lint, tests, Prisma Client generation, and production build pass on the implementation head before Draft PR.
