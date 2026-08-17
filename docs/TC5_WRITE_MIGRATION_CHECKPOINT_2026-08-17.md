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

## Extraction-only Drafts — TR pass, wiring pending

- PR #163 — Customer Notes
- PR #164 — Customer Referral identity
- PR #165 — Individual Customer Tag topology
- PR #167 — Business Export Permission setting
- PR #168 — Business Card Design settings

Classification: `EXTRACTION_TR_PASS / WIRING_PENDING / VERCEL_BUILD_RATE_LIMIT_BLOCKED`.

## Wiring progress notes

- PR #169 is now actively wired through a small Program-scoped Server Action. The active Custom Card Publish form no longer uses the legacy direct-persistence Settings action. Super Admin authorization, immutable version/storage lookup, front/back artwork URLs, fixed `ID1_V1` safe-zone behavior, and public-card revalidation are preserved.
- PR #166 is now actively wired through a small Settings-scoped Server Action. The submitted business slug is treated only as a route locator; authentication, canonical Business lookup, and authorization are re-established server-side before the semantic command owns persistence.
- Both wiring patterns avoid broad rewrites of the existing large multi-domain page/action modules and leave their legacy actions as compatibility-only code for a later cleanup slice.

## Dependency and execution order

1. Customer-detail wiring (#163–#165) follows the #162 record-maintenance integration path because these slices share the same large Customer detail Server Action/page modules. Prefer small dedicated Server Actions/components over broad rewrites.
2. Remaining Settings-family wiring is #167 then #168. Keep each bounded around the existing shared `updateBusinessSettingsCommand`; do not broadly rewrite the multi-domain Settings/Program pages merely to wire one semantic command.
3. No `/api/v1` write Route Handler is required for current UI consumption. Existing Server Actions remain the compatibility transport under the approved TC5 safe-write policy.
4. Runtime/TCR evidence remains distinct from TC/TR. Current Vercel Hobby build-rate limiting blocks fresh Preview evidence for most heads.

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
