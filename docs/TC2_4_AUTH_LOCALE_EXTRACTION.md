# TC2.4 Auth Locale Extraction

Date: 2026-08-15
Status: `INTERNAL_BETA_VERIFIED`
Environment: code and synthetic test evidence only

## Outcome

The 34 existing `auth.*` messages now live in separate English and Arabic
locale modules exposed through dependency-free `@loyalflow/i18n/auth` with
compile-time key parity. `lib/i18n/catalog.ts` remains the compatibility
adapter, so all current login/MFA callers, keys, fallbacks, and message values
remain unchanged.

Authentication actions, validation, sessions, authorization, rate limits, and
observability remain outside the message package. The slice adds no database,
schema, migration, provider, visual, Production, or real-participant behavior.

## Evidence

- 18/18 focused auth, MFA, compatibility, and workspace-boundary tests passed.
- TypeScript, scoped ESLint, and `git diff --check` passed.
- The final combined implementation head passed 1015/1015 tests, TypeScript,
  full ESLint with 0 errors, and the local Next.js 16.2.11 webpack build.

## Boundary

This is Internal/Synthetic Beta evidence. Real Closed Beta remains
`DEFERRED_REAL_CLOSED_BETA`; authentication runtime UAT, final accessibility,
Production, launch, and GA evidence remain separate.
