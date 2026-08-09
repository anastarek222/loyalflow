# T006 Marketing and Onboarding Evidence — 2026-08-09

Branch: `feat/t006-marketing-onboarding-foundation`
Verified runtime/test/config head: `d410ab98b5b5f81516f3b27e0ed5ddb15fac3958`

## Scope verified

- Public `/` marketing homepage for unauthenticated visitors while authenticated users still redirect to `/dashboard`.
- Canonical EN/AR locale cookie, direction handling, and typed catalog reuse.
- Localized public metadata with canonical `/` and index/follow behavior.
- Private owner `/onboarding` remains role/lifecycle scoped and explicitly `noindex, nofollow`.
- Existing owner onboarding save and launch writers remain authoritative; no second writer was introduced.
- No public self-service signup, payment checkout, analytics SDK/provider, dependency change, schema/migration change, database command, provider environment mutation, or production deployment was introduced.

## Verification result

The accountable owner supplied the complete local verification log for the runtime/test/config head above.

- `pnpm run typecheck`: PASS.
- `pnpm run lint`: PASS with 0 errors and 2 pre-existing warnings in `app/account/security/actions.ts` for unused `_previousState` and `_formData` parameters.
- `pnpm test`: PASS — 770/770 tests, 0 failures, duration 12373.523462 ms.
- T006-specific tests passed for public routing, canonical locale/direction reuse, bilingual catalog parity, localized indexable metadata, bounded scope, private owner onboarding, `noindex` policy, lifecycle guards, and canonical save/launch writers.
- Prisma Client generation: PASS — Prisma Client 7.9.0 generated successfully.
- Next.js production build: PASS — Next.js 16.2.11 (webpack).
- Compilation: PASS — 51s.
- Build TypeScript phase: PASS — 35.0s.
- Page-data collection: PASS — 3.7s.
- Static generation: PASS — 25/25 pages.
- Build traces: PASS — 14.0s.
- Finalization: PASS — 14.0s.

The build used a process-scoped `NEXT_PUBLIC_APP_URL=https://loyalflow-gray.vercel.app` override only.

## External CI status

The GitHub commit status currently reports Vercel failure caused by the account build-rate limit / Pro upgrade requirement. No GitHub Actions workflow run is available for this branch head. This evidence therefore records the successful reproducible local gates and does not claim a successful Vercel Preview deployment.

## Readiness

Technical gates for this bounded T006 foundation slice are complete. This evidence does not claim that all of Product P7/P8 or the full T006 queue exit criteria are complete; broader marketing conversion, analytics, full onboarding path completion, live preview/browser UAT, and other approved slices remain follow-up work.
