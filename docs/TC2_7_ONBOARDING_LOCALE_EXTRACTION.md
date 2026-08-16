# TC2.7 Owner Onboarding Locale Extraction

Date: 2026-08-16
Status: `INTERNAL_BETA_VERIFIED`
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

## Verified evidence

GitHub Staging PR Validation run `31953676478` passed on the implementation
head after updating the pre-existing T006 structural test to follow the new
canonical catalog ownership:

- focused TC2.7 parity/compatibility/source/route-boundary tests: 4/4 PASS;
- full test suite: 1028/1028 PASS;
- TypeScript (`tsc --noEmit`): PASS;
- workspace boundaries: PASS with 4 packages and 14 approved runtime exports;
- ESLint: PASS;
- Next.js production build: PASS;
- patch whitespace / `git diff --check`: PASS.

The documentation closeout head must still pass the same required Staging PR
Validation before merge.

## Boundary

Internal/Synthetic Beta only. No authentication, authorization, onboarding
state transition, tenant bootstrap, persistence, schema, migration, provider,
UI/CSS, Production, launch, or Real Closed Beta behavior is changed or proven
by this slice.
