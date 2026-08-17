# TC5 Write Migration Checkpoint — 2026-08-17

Status: `BETA_STAGING_TC_TR_COMPLETE`

This checkpoint records the current TC5 safe-write Strangler migration without changing runtime behavior.

## Integrated into `staging`

- PR #164 — Customer Referral identity — merged; command-backed active path retained.
- PR #165 — Individual Customer Tag topology — merged; command-backed active path retained.
- PR #174 — Custom Card draft upload — merged after reconciliation with the already command-backed publish path; Custom Card renderer/layout/flip behavior was not changed.
- PR #175 — Manual Google Sheets sync — merged after reconciliation with Export Permission; provider/configuration ownership remains unchanged.

Current recorded `staging` baseline after those integrations: `b5efe8b875593e66def69fc39b27663d226d1655`.

## Wired TC/TR pass set still awaiting separate integration/runtime gates

- PR #158 — Reward catalogue writes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #159 — Playbook application — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #160 — Customer creation — `WIRED_TC_TR_PASS / PREVIEW_DATABASE_URL_BLOCKED`
- PR #161 — Customer bulk status/tag writes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #162 — Customer record profile/status maintenance — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #163 — Customer Notes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #166 — Business Card Details settings — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #167 — Business Export Permission setting — `WIRED_TC_TR_PASS / RUNTIME_TCR_PENDING`
- PR #168 — Business Card Design settings — `WIRED_TC_TR_PASS / RUNTIME_TCR_PENDING`
- PR #169 — Custom Card publish persistence — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #171 — Notification read state — `TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #172 — Public membership persistence — `FINAL_HEAD_TR_PASS / NEON_SLOT_RECOVERED / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #179 — Financial writer reconciliation — `WIRED_TC_TR_PASS / PREVIEW_DATABASE_URL_TCR_BLOCKED`

## Financial write reconciliation

PRs #176, #177 and #178 independently established and validated the command/action boundaries for Customer manual balance adjustment, Loyalty Earn and Loyalty Redemption. PR #179 closes their active-adoption gap while also reconciling the already integrated Referral and Tag command-backed paths.

The reconciliation avoids replacing the large Customer or Scan pages. Their existing imports continue through `app/businesses/[slug]/customers/[customerId]/actions.ts`, which is now a Next-compatible async-only compatibility facade:

- `adjustCustomerBalanceAction` delegates to `adjustCustomerBalanceCommandAction`;
- `addLoyaltyAction` delegates to `addLoyaltyCommandAction`;
- `redeemRewardAction` delegates to `redeemRewardCommandAction`;
- Referral and individual Tag compatibility names delegate to their command-backed actions;
- Customer record/status/note compatibility remains preserved through the retained current-staging implementation and its existing command authorities.

PR #179 final head `299814d3afac69c3266e1fb7e368888879c5f7b0` passed GitHub `Staging PR Validation` run #207 (`32020250177`): focused entitlement tests, full test suite, typecheck, workspace validation, lint, Next build and patch whitespace all passed.

The exact-head Vercel deployment `dpl_63dehVZuL2Qx3nSqyzspkv9JMBbx` failed during `pnpm install` because Prisma postinstall could not resolve Preview `DATABASE_URL`. This is an environment/runtime-evidence blocker, not a GitHub CI/code regression. No environment variable was changed and no runtime/browser TCR is claimed.

## Final TC5 writer inventory

The bounded audit found no additional active persistence surface requiring another TC5 safe-write migration slice. Campaigns and Recovery are read/presentation/export surfaces; Duplicate Review is intentionally read-only and has no merge/delete writer. Current UI consumption remains on Server Actions as the approved compatibility transport; no `/api/v1` write Route Handler is introduced merely for migration symmetry.

Accordingly, the identified **TC5 safe-write code migration is TC/TR complete across the validated set**. This does not mean every remaining open PR is integrated into `staging`, and it is not runtime/browser TCR completion.

## Remaining evidence / coordination

1. Merge remains separately gated by explicit Product Owner approval and dependency-aware ordering.
2. Runtime/browser TCR remains distinct from TC/TR and must be collected only from fresh Staging/Preview executions after the relevant code is integrated.
3. Vercel Hobby `build-rate-limit` remains an external runtime-evidence blocker on several exact heads; GitHub CI success must not be relabelled as browser TCR.
4. Preview `DATABASE_URL` remains a separately recorded blocker for PR #160 and the current exact head of PR #179; no environment change is authorized by this checkpoint.
5. PRs #167 and #168 retain their separately recorded runtime TCR status.
6. PR #172 remains intentionally untouched while its Vercel blocker persists.

## Downstream Beta gate status

- TC6: the provider-neutral health/retry/outbox/Queue foundation is already implemented and TC6.5 is isolated-Staging runtime verified. Retry/backoff policy, stranded-job dispatcher/reconciliation, remaining mutation enqueue cutover, pending-aging thresholds, SLO/severity/alerts and recovery rehearsal remain decision-gated by the existing audit/register.
- TC7: invitation-only acquisition is `BETA_FOUNDATION_COMPLETE`. Self-service signup, tenant/trial bootstrap, legal consent, pricing, analytics, billing and payments remain deferred commercial/Production gates.
- TC8: the technical entry gate is ready on isolated Staging, but the governed real Closed Beta remains `DEFERRED_REAL_CLOSED_BETA`. Five to ten real businesses, participant issue disposition and an explicit human Go/No-Go remain mandatory and cannot be substituted with synthetic fixtures.

## Operating contract

- Beta/Staging only.
- No Production deployment.
- No merge without explicit Product Owner approval.
- No schema/migration in these wiring slices.
- No provider/credential/environment changes without a separate gate.
- Code/CI alone does not claim runtime TCR completion when Preview/browser evidence is required.

## Master-plan interpretation

`TC5_COMPLETION_AUDIT.md` closes the approved read foundation. This checkpoint records completion of the subsequent bounded safe-write migration at the TC/TR level across the current validated set. Integration/merge and runtime TCR remain separate gates.
