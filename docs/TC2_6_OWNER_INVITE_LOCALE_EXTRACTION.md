# TC2.6 Owner Invitation Locale Extraction

Date: 2026-08-16
Status: `INTERNAL_BETA_VERIFIED`
Environment: code and synthetic test evidence only

## Outcome

The 11 existing Owner Invitation presentation messages are now separately
sourced in Arabic and English under `@loyalflow/i18n/owner-invite` with
compile-time key parity. The compatibility catalog composes those messages
instead of owning duplicate inline values.

The public invitation page keeps the same route, locale resolution, token
preservation, `noindex` metadata, password length constraints, form action, and
error keys. Invitation acceptance, account activation, password policy,
authentication, sessions, authorization, database writes, and security behavior
are unchanged.

## Verified evidence

GitHub Staging PR Validation run `31952553473` passed on the implementation
head:

- focused TC2.6 source/parity/compatibility evidence: 4/4 PASS;
- full test suite: 1024/1024 PASS, 0 failures;
- TypeScript (`tsc --noEmit`): PASS;
- workspace boundaries: PASS with 4 packages and 13 approved runtime exports;
- ESLint: 0 errors, with the same 2 pre-existing unused-parameter warnings in
  `app/account/security/actions.ts`;
- Next.js 16.2.11 webpack production build: PASS;
- patch whitespace / `git diff --check`: PASS.

The documentation closeout head must still pass the same required Staging PR
Validation before merge.

## Evidence boundary

This is Internal/Synthetic Beta evidence only. It does not satisfy runtime
authentication UAT, Real Closed Beta, accessibility acceptance, Production,
launch, or GA evidence. No database, schema, migration, provider, credential,
UI/CSS, or Production behavior is authorized by this slice.
