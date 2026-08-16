# TC2.5 Password Policy Validation Localization

Date: 2026-08-16
Status: `IMPLEMENTED_PENDING_CI`
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

- Focused TC2.5 source/parity/policy tests are included in this branch.
- Full CI, TypeScript, ESLint, build, workspace validation, and diff integrity
  remain required before this slice can be marked verified.

## Boundary

This is an Internal/Synthetic Beta localization slice. It does not replace
runtime authentication UAT, Real Closed Beta, accessibility acceptance,
Production, launch, or GA evidence.
