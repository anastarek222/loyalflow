# T005 I18N Compatibility Foundation — Verification Evidence

Date: 2026-08-09
Branch: `feat/t005-i18n-compat-foundation`
Verified runtime/test/config head: `9bc57fce5c4ca9688885f79b206cff077428a713`

## Scope verified

- Bounded AR/EN locale configuration with English fallback.
- Typed bilingual catalog with key parity.
- SSR locale resolution from the bounded `loyalflow_locale` cookie.
- Root `<html>` language and text direction wiring (`ar`/`rtl`, `en`/`ltr`).
- Login entrypoint localization for the first bounded UI slice.
- EN/AR language switcher that persists only the locale cookie and refreshes the server-rendered route.
- Legacy `lib/i18n.ts` preserved as a compatibility adapter over the typed catalog instead of maintaining a second copy source.
- No dependency, database, migration, auth-topology, or production-deploy change in this slice.

## Local verification

Verification was rerun after the compatibility-adapter fix and after clearing stale local `.next` generated output.

The chained verification reached every gate, so `typecheck` and `lint` both exited successfully before tests and build ran.

- TypeScript: PASS (`pnpm run typecheck`).
- ESLint: PASS (`pnpm run lint`).
- Tests: PASS — 759/759, 0 failed, duration 13236.358137 ms.
- Prisma Client generation: PASS — Prisma Client 7.9.0 generated successfully.
- Next.js production build: PASS — Next.js 16.2.11 (webpack).
- Compilation: PASS — 51s.
- Build TypeScript phase: PASS — 33.8s.
- Page-data collection: PASS — 3.6s.
- Static generation: PASS — 25/25 pages in 6.8s.
- Build traces: PASS — 14.0s.
- Finalization: PASS — 14.0s.

The build used a one-process `NEXT_PUBLIC_APP_URL=https://loyalflow-gray.vercel.app` override only; no repository environment file or provider setting was changed.

## CI / Preview note

Vercel status on this branch is not treated as a code failure: the account currently reports a build-rate-limit / upgrade gate. No Vercel build pass is claimed from that status.

## Governance exception

No independent GitHub reviewer was available for this repository. On 2026-08-09, the repository owner explicitly chose the governance-exception path and authorized merging T005 without an Independent Reviewer approval after being told that this waives the normal review gate for this task only.

This exception does not waive the recorded quality gates above and does not authorize any production deploy, database command, migration, dependency change, or unrelated governance exception.

## Gate interpretation

This evidence-only documentation commit does not modify runtime, test, configuration, dependency, or database files. Therefore the successful gates above remain valid for the verified T005 code tree and do not require another rerun solely because this evidence file was updated.

Status: `READY FOR MERGE — OWNER-APPROVED REVIEW EXCEPTION`.
