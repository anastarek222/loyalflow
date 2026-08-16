# TC2.8 Conversion Locale Extraction

Date: 2026-08-16
Status: `INTERNAL_BETA_VERIFIED`
Environment: code and synthetic test evidence plus isolated Staging deployment

## Outcome

The 13 existing conversion and `/get-started` presentation messages are now separately sourced in Arabic and English under `@loyalflow/i18n/conversion`. The compatibility catalog composes those values instead of owning duplicate inline conversion copy.

The `/get-started` route keeps the approved invitation-only Beta acquisition boundary. Existing-account login and Owner Invitation remain the supported conversion destinations; this slice does not add self-service signup, checkout, pricing activation, payment, or another tenant-bootstrap path.

Authentication, authorization, tenant isolation, invitation lifecycle, persistence, schema, provider, and Product policy remain unchanged.

## Verified evidence

GitHub Staging PR Validation run `31957526478` passed on TC2.8 implementation head `0ac3668c8259a1846e7b182de8749ac04ef87329` before merge through PR #142:

- focused TC2.8 parity, compatibility, and acquisition-boundary tests: 3/3 PASS;
- full test suite: 1032/1032 PASS;
- TypeScript (`tsc --noEmit`): PASS;
- workspace boundaries: PASS with 4 packages and 15 approved runtime exports;
- ESLint: PASS with no errors; two pre-existing warnings outside TC2.8 scope remain unchanged;
- Next.js production build: PASS;
- patch whitespace / `git diff --check`: PASS.

PR #142 merged to `staging` at `2b3c1324794df1ead3e3ca03c79e2ac4e305793a`. The Vercel Staging deployment for that merge reached Ready.

## Boundary

Internal/Synthetic Beta only. No authentication or authorization behavior, invitation lifecycle, tenant bootstrap, self-service signup, billing/payment, analytics, persistence, schema, migration, provider activation, Production, Real Closed Beta, or GA behavior is changed or proven by this slice.
