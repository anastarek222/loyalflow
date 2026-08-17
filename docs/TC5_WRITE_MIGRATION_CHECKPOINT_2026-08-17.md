# TC5 Write Migration Checkpoint — 2026-08-17

Status: `BETA_STAGING_COORDINATION_ONLY`

This checkpoint records the current TC5 safe-write Strangler migration without changing runtime behavior.

## Wired Drafts — TC/TR pass

- PR #158 — Reward catalogue writes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #159 — Playbook application — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #160 — Customer creation — `WIRED_TC_TR_PASS / PREVIEW_DATABASE_URL_BLOCKED`
- PR #161 — Customer bulk status/tag writes — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #162 — Customer record profile/status maintenance — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #166 — Business Card Details settings — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #169 — Custom Card publish persistence — `WIRED_TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #171 — Notification read state — `TC_TR_PASS / VERCEL_BUILD_RATE_LIMIT_BLOCKED`
- PR #172 — Public membership persistence — `FINAL_HEAD_TR_PASS / NEON_SLOT_RECOVERED / VERCEL_BUILD_RATE_LIMIT_BLOCKED`

None of these Drafts is merged by this checkpoint.

## Prepared Drafts — command + bounded action TR pass, page binding pending

- PR #163 — Customer Notes — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING`
- PR #164 — Customer Referral identity — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING`
- PR #165 — Individual Customer Tag topology — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING`
- PR #167 — Business Export Permission setting — `COMMAND_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING`
- PR #168 — Business Card Design settings — `COMMAND_TR_PASS / INPUT_CONTRACT_TR_PASS / BOUNDED_ACTION_TR_PASS / PAGE_BINDING_PENDING`

These five slices no longer require business-logic extraction. Each now has an isolated command-backed Server Action with passing GitHub TC/TR evidence. Their remaining code step is to replace the legacy page/form binding with the validated bounded action, followed by another final-head TR run.

No runtime/browser TCR is claimed for these heads while fresh Preview evidence is unavailable.

## Wiring progress notes

- PR #169 is actively wired through a small Program-scoped Server Action. The active Custom Card Publish form no longer uses the legacy direct-persistence Settings action. Super Admin authorization, immutable version/storage lookup, front/back artwork URLs, fixed `ID1_V1` safe-zone behavior, and public-card revalidation are preserved.
- PR #166 is actively wired through a small Settings-scoped Server Action. The submitted business slug is treated only as a route locator; authentication, canonical Business lookup, and authorization are re-established server-side before the semantic command owns persistence.
- PR #163 isolates Customer Notes auth, tenant/capability checks, parsing, presentation preflight, redirects and revalidation from the authoritative note command.
- PR #164 isolates Customer Referral identity handling while preserving existing-code replay before EXPAND preflight and keeping unique-race recovery in the command.
- PR #165 isolates create/assign/remove Customer Tag actions while preserving EXPAND versus OPERATE classification and no-op convergence in the commands.
- PR #167 isolates Super Admin Export Permission handling while preserving unchanged-value replay before OPERATE enforcement.
- PR #168 adds a reusable Card Design input contract and a bounded command-backed action. Custom Card front/back requirements, `ID1_V1`, role/current-mode authorization, and logo validation remain explicit.

## Dependency and execution order

1. Customer-detail page binding: #163, #164, #165. Only import/form-action adoption remains; do not move persistence logic back into the Customer page.
2. Settings/Program page binding: #167 then #168. Keep each adoption to the existing validated bounded action and avoid broad page rewrites.
3. After each binding, rerun focused tests, full tests, typecheck, workspace validation, lint, Next build and patch whitespace on that PR's final head.
4. No `/api/v1` write Route Handler is required for current UI consumption. Server Actions remain the approved compatibility transport under the TC5 safe-write policy.
5. Runtime/TCR evidence remains distinct from TC/TR and must be collected only when a fresh Staging/Preview runtime is available.

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
