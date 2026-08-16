# TC2.5 Password Policy Validation Localization

Date: 2026-08-16
Status: `INTERNAL_BETA_VERIFIED`
Environment: code and synthetic test evidence only

## Outcome

The existing password-confirmation mismatch copy is no longer owned inline by
the auth validation policy. Separate Arabic and English message sources are
exposed through dependency-free `@loyalflow/i18n/password-policy`, and the
password policy now provides a locale-aware schema factory.

The existing exported `passwordConfirmationSchema` remains Arabic-backed so
current callers preserve their exact validation message and security behavior.
The minimum and maximum password lengths remain 10 and 100. No session,
authorization, rate-limit, credential, password hashing, reset, invitation,
database, schema, provider, UI, or Production behavior changes in this slice.

## Evidence

- focused TC2.5 source/parity/policy tests: 5/5 PASS
- full test suite: 1020/1020 PASS
- TypeScript: PASS
- workspace boundaries: PASS, including 12 approved runtime exports
- ESLint: PASS
- Next.js production build: PASS
- patch whitespace/diff integrity: PASS
- GitHub Staging PR Validation run `31951794657`: PASS

The feature-branch Vercel Preview remains outside this evidence because its
Prisma postinstall cannot resolve `DATABASE_URL`; this is the established
branch-scoped Preview environment limitation, not a TC2.5 runtime regression.
The isolated `staging` deployment remains the runtime gate after merge.

## Boundary

This is an Internal/Synthetic Beta localization slice. It does not replace
runtime authentication UAT, Real Closed Beta, accessibility acceptance,
Production, launch, or GA evidence.
