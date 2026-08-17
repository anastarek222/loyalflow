# TC5 Write Migration Checkpoint — 2026-08-17

Status: `BETA_STAGING_TC_TR_COMPLETE`

This checkpoint records the current TC5 safe-write Strangler migration without changing runtime behavior.

## Wired Drafts — TC/TR pass

- PR #158 — Reward catalogue writes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #159 — Playbook application — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #160 — Customer creation — `WIRED_TC_TR_PASS / PREVIEW_DATABASE_URL_BLOCKED`
- PR #161 — Customer bulk status/tag writes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #162 — Customer record profile/status maintenance — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #163 — Customer Notes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #164 — Customer Referral identity — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #165 — Individual Customer Tag topology — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #166 — Business Card Details settings — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #167 — Business Export Permission setting — `WIRED_TC_TR_PASS / RUNTIME_TCR_PENDING`
- PR #168 — Business Card Design settings — `WIRED_TC_TR_PASS / RUNTIME_TCR_PENDING`
- PR #169 — Custom Card publish persistence — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #171 — Notification read state — `TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #172 — Public membership persistence — `FINAL_HEAD_TR_PASS / NEON_SLOT_RECOVERED / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #174 — Custom Card draft upload — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #175 — Manual Google Sheets sync — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #179 — Financial writer reconciliation for Balance Adjustment, Earn and Redemption — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`

## Financial write reconciliation

PRs #176, #177 and #178 independently established and validated the command/action boundaries for Customer manual balance adjustment, Loyalty Earn and Loyalty Redemption. PR #179 closes their previously pending active-adoption gap.

The reconciliation avoids replacing the large Customer or Scan pages. Their existing imports continue through `app/businesses/[slug]/customers/[customerId]/actions.ts`, which is now a Next-compatible async-only compatibility facade:

- `adjustCustomerBalanceAction` delegates to `adjustCustomerBalanceCommandAction`;
- `addLoyaltyAction` delegates to `addLoyaltyCommandAction`;
- `redeemRewardAction` delegates to `redeemRewardCommandAction`;
- the remaining non-financial compatibility names delegate to the retained legacy implementation.

PR #179 head `89ca4ebd2387ba249fa092c25886b8835b9d1aaf` passed GitHub `Staging PR Validation` run #194 (`32012907919`): focused entitlement tests, **1079/1079 full tests**, typecheck, workspace validation, lint, Next build and patch whitespace all passed. Exact-head Vercel is blocked by Hobby `build-rate-limit`, so no fresh runtime/browser TCR is claimed.

## Final TC5 writer inventory

The bounded audit found no additional active persistence surface requiring another TC5 safe-write migration slice. Campaigns and Recovery are read/presentation/export surfaces; Duplicate Review is intentionally read-only and has no merge/delete writer. Current UI consumption remains on Server Actions as the approved compatibility transport; no `/api/v1` write Route Handler is introduced merely for migration symmetry.

Accordingly, the identified **TC5 safe-write code migration is TC/TR complete across the Draft set**. This is not a claim that the unmerged Draft code is already present on `staging`, and it is not runtime/browser TCR completion.

## Remaining evidence / coordination

1. Merge remains separately gated by explicit Product Owner approval and dependency-aware ordering.
2. Runtime/browser TCR remains distinct from TC/TR and must be collected only from fresh Staging/Preview executions after the relevant code is integrated.
3. Vercel Hobby `build-rate-limit` remains an external runtime-evidence blocker on several exact heads; GitHub CI success must not be relabelled as browser TCR.
4. PR #160 retains its separately recorded Preview `DATABASE_URL` blocker.
5. PRs #167 and #168 retain their separately recorded runtime TCR status.

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

`TC5_COMPLETION_AUDIT.md` closes the approved read foundation. This checkpoint records completion of the subsequent bounded safe-write migration at the TC/TR level across the current Draft set. Integration/merge and runtime TCR remain separate gates.
