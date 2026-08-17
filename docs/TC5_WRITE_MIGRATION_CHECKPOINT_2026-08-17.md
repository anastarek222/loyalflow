# TC5 Write Migration Checkpoint — 2026-08-17

Status: `BETA_STAGING_COORDINATION_ONLY`

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

## Financial write boundaries — TC/TR pass, active binding pending

- PR #176 — Customer manual balance adjustment — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #177 — Loyalty Earn — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #178 — Loyalty Redemption — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING / VERCEL_BUILD_RATE_LIMIT_BLOCKED`

The three financial Drafts deliberately preserve the canonical financial helpers and move only semantic transaction authority into commands. Their existing Customer/Scan bindings remain legacy compatibility bindings until a safe reconciliation/adoption step can update the shared Customer detail surface.

None of these Drafts is merged by this checkpoint.

No runtime/browser TCR is claimed for heads without fresh Preview evidence.

## Wiring progress notes

- PR #175 is actively wired: Business Settings manual Google Sheets sync uses `syncGoogleSheetCommandAction`. Final-head run #172 passed focused tests, the full suite, typecheck, workspace validation, lint, Next build, and patch whitespace. Exact-head Vercel is blocked by Hobby `build-rate-limit`.
- PR #174 is actively wired: `CustomCardArtworkManager` routes front/back draft upload through `uploadCustomCardDraftCommandAction`. Final-head run #157 passed all GitHub application gates. Publish remains separate in PR #169. Exact-head Vercel is blocked by Hobby `build-rate-limit`.
- PR #169 is actively wired through a Program-scoped Server Action. Custom Card Publish no longer uses the legacy direct-persistence Settings action.
- PR #166 is actively wired through a Settings-scoped Server Action.
- PR #167 is actively wired through `updateBusinessExportPermissionCommandAction`; final-head run #140 passed all GitHub application gates.
- PR #168 is actively wired through `updateBusinessCardDesignCommandAction`; final-head run #139 passed all GitHub application gates.
- PR #163 is actively wired for Customer Note create/update; final-head run #143 passed all GitHub application gates.
- PR #164 is actively wired for Customer referral-code creation; final-head run #151 passed all GitHub application gates.
- PR #165 is actively wired for Customer Tag create/assign/remove; final-head run #153 passed all GitHub application gates.
- PR #176 prepared Customer balance adjustment command/action; run #174 passed every GitHub application gate. Exact-head Vercel is blocked by Hobby `build-rate-limit`.
- PR #177 prepared Loyalty Earn command/action while preserving promotion, reward-unlock, idempotency and canonical financial semantics; run #175 passed every GitHub application gate. Exact-head Vercel is blocked by Hobby `build-rate-limit`.
- PR #178 prepared Loyalty Redemption command/action while preserving reward-expiry, balance, idempotency and canonical financial semantics; run #176 passed every GitHub application gate. Exact-head Vercel is blocked by Hobby `build-rate-limit`.

## Remaining TC5 closeout

1. Adopt the prepared financial actions on the shared Customer/Scan surfaces: Balance Adjustment (#176), Earn (#177), Redemption (#178). The current connector can read the complete page but does not provide an atomic partial-file patch, while the local GitHub path is DNS-blocked. Do not replace the large shared page merely to work around tooling; use a safe bounded patch path when available.
2. Run final-head GitHub validation after financial active adoption and fix only migration-related stale structural assertions if encountered.
3. The final operational writer inventory found no additional persistence surface: Campaigns and Recovery are read/presentation/export surfaces; Duplicate Review is explicitly read-only and intentionally has no merge/delete writer.
4. Do not introduce `/api/v1` write Route Handlers for current UI consumption. Server Actions remain the approved compatibility transport under the TC5 safe-write policy.
5. Runtime/TCR evidence remains distinct from TC/TR and must be collected only when a fresh Staging/Preview runtime is available.
6. Vercel Hobby build-rate-limit remains an external runtime-evidence blocker for several exact heads; do not reinterpret GitHub TC/TR success as browser TCR completion.

## Downstream Beta gate status

- TC6: the provider-neutral health/retry/outbox/Queue foundation is already implemented and TC6.5 is isolated-Staging runtime verified. The TC6 completion audit and Beta Deferred Register explicitly keep retry/backoff policy, stranded-job dispatcher/reconciliation, remaining mutation enqueue cutover, pending-aging thresholds, SLO/severity/alerts, and recovery rehearsal behind named Product/operations decisions. No additional pure TC6 slice is authorized merely to continue coding.
- TC7: the invitation-only acquisition foundation is `BETA_FOUNDATION_COMPLETE`. Self-service signup, tenant/trial bootstrap, legal consent, pricing, analytics, billing and payments remain deferred commercial/Production gates.
- TC8: the technical entry gate is ready on isolated Staging, but the governed real Closed Beta remains `DEFERRED_REAL_CLOSED_BETA`. Five to ten real businesses, participant issue disposition and an explicit human Go/No-Go remain mandatory and cannot be substituted with synthetic fixtures.
- The Beta Technical Completion Audit states that the remaining gates are decision/runtime/real-participant boundaries rather than another broad safe-code-cleanup backlog. Therefore the project must not invent extra TC6/TC7/TC8 implementation solely to create activity.

## Operating contract

- Beta/Staging only.
- No Production deployment.
- No merge without explicit Product Owner approval.
- No schema/migration in these wiring slices.
- No provider/credential/environment changes without a separate gate.
- One bounded wiring surface per PR.
- Code/CI alone does not claim runtime TCR completion when Preview/browser evidence is required.

## Master-plan interpretation

`TC5_COMPLETION_AUDIT.md` closes the approved read foundation only and explicitly leaves broader TC5 write architecture open. The current command migration is therefore a continuation of TC5, not a replacement of or contradiction to that audit.
