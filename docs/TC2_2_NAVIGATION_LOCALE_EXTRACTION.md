# TC2.2 Navigation Locale Extraction

Date: 2026-08-15
Status: `INTERNAL_BETA_VERIFIED`
Environment: code and synthetic test evidence only

## Outcome

The app-shell navigation copy is now owned by the dependency-free
`@loyalflow/i18n/navigation` export. English and Arabic messages live in
separate locale modules with compile-time key parity. The existing web adapter
continues to own authorization, entitlements, destinations, ordering,
experience-mode rules, and page-context selection.

This extraction preserves every current message value, route, item ID, role
capability result, and AR/EN navigation shape. It adds no database, provider,
schema, migration, visual, Production, or real-participant behavior.

## Evidence

- 32/32 focused navigation, role, experience-mode, Operations, and locale
  extraction tests passed; the required full suite then passed 1010/1010.
- TypeScript passed after local Prisma client generation; generation used a
  non-routable placeholder URL and performed no database operation.
- ESLint passed with 0 errors and the same two pre-existing unused-parameter
  warnings in `app/account/security/actions.ts`.
- The Next.js 16.2.11 webpack build passed under explicit local Staging identity
  after raising the build worker heap limit; it performed no deployment.
- `git diff --check` passed.

## Boundary

This is Internal/Synthetic Beta evidence. Real Closed Beta remains
`DEFERRED_REAL_CLOSED_BETA`; this extraction cannot satisfy real-business,
Production, launch, or GA evidence.
