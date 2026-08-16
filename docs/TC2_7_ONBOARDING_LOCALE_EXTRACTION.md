# TC2.7 Owner Onboarding Locale Extraction

Date: 2026-08-16
Status: `IMPLEMENTED_PENDING_CI`
Environment: code and synthetic test evidence only

## Outcome

The six existing `onboarding.*` presentation messages are now separately sourced
in Arabic and English under `@loyalflow/i18n/onboarding`. The compatibility
catalog composes those values instead of owning duplicate inline copy.

The authenticated Owner onboarding route keeps the same session requirement,
OWNER/PENDING eligibility checks, existing-business redirect boundary, locale
resolution, save action, launch action, database reads/writes, and wizard
behavior. This slice does not localize or otherwise change the page's existing
static Next.js metadata declaration.

## Required evidence

GitHub Staging PR Validation must pass focused TC2.7 tests, the full suite,
TypeScript, workspace boundaries, ESLint, the Next.js production build, and
patch whitespace before merge.

## Boundary

Internal/Synthetic Beta only. No authentication, authorization, onboarding
state transition, tenant bootstrap, persistence, schema, migration, provider,
UI/CSS, Production, launch, or Real Closed Beta behavior is changed or proven
by this slice.
