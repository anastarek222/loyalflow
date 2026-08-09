# T006 Public Browser UAT Verification

Verified on branch `test/t006-public-browser-uat`.

## Verified runtime head

`88b174d77f0a670d9e16e4b59d9e4d593a36d13e`

## Local gates

- TypeScript: PASS (`tsc --noEmit`)
- ESLint: PASS with 0 errors and 2 pre-existing warnings in `app/account/security/actions.ts`
- Unit/contract tests: 784/784 PASS
- Targeted Playwright public conversion UAT: 3/3 PASS
  - Desktop: homepage routes to `/get-started`, supported conversion paths visible
  - Desktop: English LTR switches to Arabic RTL using the canonical language switcher
  - Mobile: public marketing and conversion paths remain usable at 390px width

## Scope note

The full repository browser suite also contains pre-existing fixture-dependent U13 and owner-onboarding tests that require `UAT_FIXTURE_PASSWORD` and disposable fixture setup. Those were not executed as part of this T006 public conversion slice because they are outside this slice and require separate fixture/DB authorization. The targeted T006 browser spec is self-contained and passed without database setup, migrations, or production deployment.

## External CI

Vercel remained unavailable because the account hit its build-rate limit. No code-failure conclusion is drawn from that external status.
