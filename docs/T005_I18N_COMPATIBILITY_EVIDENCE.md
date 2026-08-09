# T005 I18N Compatibility Foundation — Verification Evidence

Date: 2026-08-09
Branch: `feat/t005-i18n-compat-foundation`
Verified source head before evidence-only commit: `684af8796110130cf49cc32f40a67c6e955d68bc`

## Scope verified

- Bounded AR/EN locale configuration with English fallback.
- Typed bilingual catalog with key parity.
- SSR locale resolution from the bounded `loyalflow_locale` cookie.
- Root `<html>` language and text direction wiring (`ar`/`rtl`, `en`/`ltr`).
- Login entrypoint localization for the first bounded UI slice.
- EN/AR language switcher that persists only the locale cookie and refreshes the server-rendered route.
- No dependency, database, migration, auth-topology, or production-deploy change in this slice.

## Local verification

The verification command was run after deleting stale local `.next` generated output. The first typecheck attempt had failed only because stale `.next/types` still referenced a route from another branch; clearing `.next` removed that generated-cache artifact.

The successful chained verification reached every gate, so `typecheck` and `lint` both exited successfully before tests and build ran.

- TypeScript: PASS (`pnpm run typecheck`).
- ESLint: PASS (`pnpm run lint`).
- Tests: PASS — 758/758, 0 failed, duration 13080.584718 ms.
- Prisma Client generation: PASS — Prisma Client 7.9.0 generated successfully.
- Next.js production build: PASS — Next.js 16.2.11 (webpack).
- Compilation: PASS — 55s.
- Build TypeScript phase: PASS — 33.4s.
- Page-data collection: PASS — 3.6s.
- Static generation: PASS — 25/25 pages.
- Build traces/finalization: PASS.

The build used a one-process `NEXT_PUBLIC_APP_URL=https://loyalflow-gray.vercel.app` override only; no repository environment file or provider setting was changed.

## CI / Preview note

Vercel status on this branch is not treated as a code failure: the account currently reports a build-rate-limit / upgrade gate. No Vercel build pass is claimed from that status.

## Gate interpretation

This evidence-only documentation commit does not modify runtime, test, configuration, dependency, or database files. Therefore the successful gates above remain valid for the verified T005 code tree and do not require an endless rerun solely because this evidence file was added.

Status after local quality gates: `READY FOR REVIEW`.
