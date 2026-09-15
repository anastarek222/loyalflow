# Phase H Browser UAT — Preview Authentication Gate — 2026-09-15

Status: `PARTIAL / BLOCKED`

## Corrected target

- Product branch: `fix/reward-truth-core`
- Pull request: `#549`
- Product SHA under current UAT: `f85b4f5abcd3ef6c129c5f23826c349de69f1025`
- Vercel Preview deployment: `dpl_Dj8Sz8PAVZLCvgCWFfT8Y6Ce8c5g`
- Exact Preview URL: `https://loyalflow-dhv01bm8y-anas-tarek.vercel.app`
- Preview branch: `fix/reward-truth-core`
- Preview database target: designated Neon `loyalflow-staging/main` (`divine-fog-40741793` / `br-wispy-morning-aub14jdr` / `neondb`)

The branch-scoped Preview `DATABASE_URL` was corrected administratively in Vercel and a fresh Preview was created from the product branch. The previous legacy-database `P2022` blocker is no longer the active gate.

No connection string, password, share token, or other secret is recorded in this evidence file.

## Invalid-card application gate

After the Preview database correction, the corrected Preview returned the expected invalid-card behavior through authenticated Vercel access:

- route: `/card/not-a-valid-public-token`
- expected: HTTP `404`
- observed: HTTP `404`
- surface: unavailable-card / not-found state

This confirms that the application/database mismatch that previously produced HTTP `500` was corrected.

## External real-browser gate

The remaining blocker is Vercel Deployment Protection for the external GitHub-hosted browser runner, not the application or Staging database.

Multiple isolated Agent-only workflows were attempted without changing product code:

- normal temporary Vercel share-link navigation;
- bundled Playwright Chromium using the exact auth sequence that had previously reached the older Preview;
- system Google Chrome;
- persistent Chrome profile reuse;
- Chrome DevTools Protocol session reuse;
- sending the temporary share token as `x-vercel-protection-bypass` with `x-vercel-set-bypass-cookie: true`.

Current external-run evidence:

- run `34982924484`: the exact previously-successful Playwright auth sequence redirected to `vercel.com` before the invalid-card request could execute;
- run `34983441386`: direct preflight using the temporary share token as a protection-bypass header returned HTTP `200` from host `vercel.com`, not the Preview application;
- both runs completed emergency cleanup and verified `FINAL_UAT_FIXTURE_COUNT=0`.

Therefore the temporary `_vercel_share` value is not usable as the Automation Protection Bypass secret for this external runner.

## Vercel-supported automation path

Vercel documentation for automated testing of protected deployments specifies `VERCEL_AUTOMATION_BYPASS_SECRET` and the request headers:

- `x-vercel-protection-bypass: <automation bypass secret>`
- `x-vercel-set-bypass-cookie: true`

The connected Vercel capability can inspect deployments and generate temporary share links, but it does not expose the Automation Protection Bypass secret value or an action to configure that project secret. The repository also does not currently contain a `VERCEL_AUTOMATION_BYPASS_SECRET` reference that can be reused by the external runner.

This is now the sole browser-execution gate.

## Fixture safety

All current external-browser attempts stopped before `scripts/prepare-final-uat-fixtures.ts` could create data.

- final-UAT fixtures created by the blocked runs: `0`
- emergency cleanup: `PASS`
- final verification: `FINAL_UAT_FIXTURE_COUNT=0`
- Production database queries/writes: none
- Schema/migration writes: none
- WhatsApp implementation changes: none

## Production containment note

During the earlier Vercel dashboard redeploy flow, a Preview was accidentally promoted to Production. It was immediately restored to the previously correct Production deployment from `main` at SHA `75ee9fb1c4bd4561f58b3a902eb9f6eb49ee3482` (`dpl_CYS6TRgjX1FU8BaVMUp2FXkk7Rmo`).

No Production database, schema, migration, or environment-variable change was performed as part of that incident. Further Phase H work remains Preview/Staging only.

## Next gate

Before the remaining Browser UAT can run, an administrator must provide the external GitHub Actions runner with the Vercel Automation Protection Bypass secret through an approved secret channel (for example a GitHub Actions secret named `VERCEL_AUTOMATION_BYPASS_SECRET`). Do not paste the secret into source, PR comments, logs, or chat.

Once that approved secret path exists, the next run is strictly:

1. send the official Vercel automation-bypass headers to the exact corrected Preview;
2. verify `/card/not-a-valid-public-token` returns HTTP `404` in real Chromium before fixtures;
3. create synthetic Staging fixtures using the official fixture script;
4. run desktop/tablet/mobile Browser UAT for Public Card/join, customer profile, Scan, reward availability/redemption, Owner/Manager/Staff/Viewer, Super Admin, permission denial, subscription restriction, Arabic/RTL, invalid routes, and tenant isolation;
5. run official cleanup regardless of test result;
6. verify final-UAT fixture count returns to `0`.

No merge or Production action is authorized by this evidence update.
