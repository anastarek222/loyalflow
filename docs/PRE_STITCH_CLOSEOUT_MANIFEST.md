# Tanee / LoyalFlow — Pre-Stitch Closeout Manifest

Status: **ACTIVE — GLOBAL FREEZE BLOCKED**

Last reconciled: 2026-09-17

This document is the current Product / Logic / Functional UX / Integration closeout authority before Stitch. It is **not Production authorization**. Production remains untouched unless the Owner explicitly authorizes a separate Production release step.

## Release authority

- Production/default `main` reference: `75ee9fb1c4bd4561f58b3a902eb9f6eb49ee3482`.
- Last runtime-changing Staging checkpoint: `7bf51c1f08d2c132cce17cb39ae45b9cfc436e8d`.
- That checkpoint's Vercel deployment: `dpl_vBuC3rgjb8AUc15ko21ekGAcuzSn`, state `READY`.
- Exact runtime evidence on that deployment includes `GET /` HTTP 200 and no observed warning/error/fatal runtime logs after deployment.
- The current `staging` branch head is intentionally **not self-pinned in this file**. Merging this document necessarily advances the branch SHA. Resolve the live branch head from GitHub; documentation-only commits after `7bf51c1...` do not redefine the runtime Product contract.
- Direct protected `/api/health/live` and authenticated exact-SHA browser UAT must use the repository's secure encrypted handoff workflow. Do not weaken Vercel Deployment Protection to obtain a receipt.

## Global branch-reconciliation gate

At the 2026-09-17 closeout checkpoint, `main` and `staging` are diverged rather than ancestor/descendant. After the first manifest publication, the measured state was:

- Staging-side commits not in `main`: 362
- Main-side commits not in `staging`: 163
- merge base: `e09f92c54bb52d9fba32e43c488ca54c56a69b82`

These counts are diagnostic, not a merge instruction. The active frontend lane on `main` is also diverged from Staging. Therefore **GLOBAL PRE-STITCH FREEZE MUST NOT be declared** until frontend work freezes and one reconciled candidate is built deliberately.

Do not merge `main` into `staging` or `staging` into `main` merely to eliminate the count.

## Source / CI authority

Current Staging includes:

- PR #579: PUBLIC_TRIAL legal-acceptance redemption hardening.
- PR #580: Meta Embedded Signup / WhatsApp staging integration fixes.

The runtime source tree at `7bf51c1...` is the same Product tree as the fully validated PR #580 head. Validation evidence:

- immutable migration manifest: PASS
- destructive migration scan: PASS
- Prisma validation: PASS
- disposable PostgreSQL migration rehearsal: PASS
- focused subscription tests: PASS
- full tests: **2003 / 2003 PASS**
- TypeScript: PASS
- workspace boundaries: PASS
- lint: PASS
- production-style build: PASS
- Chromium browser smoke: PASS
- browser runtime receipts: PASS
- whitespace: PASS

The later manifest-only PR #581 also passed full tests, typecheck, boundaries, lint, build, migration checks, and whitespace. Its browser smoke was correctly skipped by docs-only scope detection.

`Slice D Exact-SHA Runtime UAT` remains a separate gate. It runs only through the dedicated trigger branch and encrypted handoff containing the Staging database access, disposable UAT password, and Vercel automation bypass secret. A normal skipped run is neither a failure nor runtime certification.

## Staging database / data integrity

Read-only verification against the dedicated Neon Staging database currently shows:

- migrations: 57 applied; 0 unfinished; 0 rolled back
- cross-Business ledger/customer/redemption/unlock/reversal mismatches: 0
- tenant users without a Business: 0
- Super Admin users incorrectly attached to a Business: 0
- branch-assignment Business mismatches: 0
- orphan branches / branch assignments: 0
- balance reconciliation mismatches: 0
- lifetime-earned mismatches: 0
- lifetime-redeemed mismatches: 0
- invalid financial type/amount/reversal rows: 0
- duplicate Business-scoped loyalty idempotency keys: 0
- broken redemption-to-ledger links: 0
- broken redemption-to-unlock links: 0
- stalled queries over 30 seconds at inspection time: 0
- held locks at inspection time: 0
- malformed used-before-created auth token timestamps: 0

Observed role topology is clean: one global Super Admin with no Business and two Business-scoped Owners.

## Owner Trial / Email

Closed in source:

- public Trial input requires explicit Terms acceptance
- issuance binds the accepted legal effective date
- `PUBLIC_TRIAL` redemption rejects a token without a valid bound legal-acceptance snapshot
- auth email delivery remains fail-closed through the Resend boundary
- disposable loopback email delivery requires both `CI=true` and the explicit private CI sink flag
- email idempotency keys do not expose raw email/token values
- permanent browser receipt covers request → captured email → exact token acceptance → replay rejection → onboarding → launch → persisted Trial

Current Trial authority is **14 days** (`TRIAL_DURATION_DAYS = 14`). Older seven-day evidence is historical only.

Open gates:

- Public Trial runtime is blocked until the approved legal publication profile exists. Required values are publication status, legal entity name, country/jurisdiction, contact email, and effective date.
- No legal identity/effective date is currently authoritative in repository or prior approved project context; do not invent placeholder values.
- Current final-candidate external Email provider delivery evidence remains OPEN.

## WhatsApp V1

Current source/CI covers six events:

- Welcome
- Balance Updated
- Reward Ready
- Reward Redeemed
- New Reward
- New Offer

Current contracts include Business-scoped sender credentials, explicit consent, STOP authority, current-phone binding, stale-consent invalidation, atomic reconfirmation that cannot override STOP, durable outbox jobs, queue idempotency, provider-owned template approval, Business-scoped readiness, manual/automatic delivery authority, Meta Embedded Signup origin validation, and CSP/popup support for the official Meta SDK.

Current Staging provider state:

- connected WhatsApp credential rows: **0**
- approved template bindings: **3**
- approved bindings: Arabic `WELCOME`, `BALANCE_UPDATED`, `REWARD_READY`
- current connected WABA/sender: none

Therefore provider certification remains **OPEN / BLOCKED ON RECONNECT + LIVE PROVIDER EVIDENCE**. Historical provider failures are not exact-head success evidence.

## Workers / Queue / Outbox

Current source/CI enforces job-id-only queue messages, queue idempotency, atomic PostgreSQL leases, maximum-three-attempt retry policy, terminal `DEAD` state for non-retryable failures, bounded stranded-job reconciliation, and bounded recovery heartbeat scheduling.

Current Staging durable state:

- `PENDING`: 0
- `FAILED`: 0
- `PROCESSING`: 0
- eligible stranded jobs: 0

Historical Staging runtime proves real Queue execution for Google Sheets and WhatsApp. A fresh queue callback has not yet executed on the last runtime-changing checkpoint, so exact-head Queue callback execution remains OPEN even though source/CI/durable state are clean.

## Google Sheets

Google Sheets is fail-closed in source. Current Staging runtime has recorded `MISSING_SPREADSHEET_ID`, referring to the global `GOOGLE_SPREADSHEET_ID` integration configuration.

Status: **BLOCKED ON ENVIRONMENT CONFIGURATION** if Google Sheets remains enabled in final release scope.

## Custom Card / Vercel Blob

Current source/CI covers private tenant-scoped Blob paths, bounded Front + Back uploads, strict image decoding, private readback, explicit missing/provider/auth failure states, and paginated retained-artwork listing.

Current Staging data contains a real managed Vercel Blob Front + Back pair for an enabled Custom Card Business.

Historical non-Production external certification remains valid evidence of platform capability: an isolated private Preview object was uploaded, read through the Product helper, deleted, and cleanup verified; the temporary mutating diagnostic was removed afterwards. Production Blob was not touched.

Current exact-SHA protected HTTP readback was not repeated because ordinary tooling is stopped by Deployment Protection. Keep these statements separate:

- non-Production live Blob capability: previously certified PASS
- current source / CI: PASS
- current protected exact-SHA HTTP readback: not repeated

## Roles / permissions / UAT

Source authority covers Super Admin, Owner, Manager, Staff, and Viewer independently from UI visibility. Current Staging DB inspection shows no detected cross-Business topology mismatch across users, branches, assignments, loyalty ledger, rewards, redemptions, unlocks, or reversals.

Normal CI browser smoke is green. Final authenticated multi-role exact-SHA Staging UAT still requires the secure handoff workflow and must be repeated on the final reconciled candidate.

## Frontend reconciliation guardrails

The active frontend candidate is not yet reconciled with current Staging. Two concrete Product-contract hotspots have already been identified and recorded on frontend PR #573:

1. **Public Trial legal gate** — frontend presentation must preserve `getPublicLegalProfile()`, `legalPublished`, `legalEffectiveDate`, hidden legal revision submission, legal-updated/legal-unavailable feedback, fail-closed checkbox/submit state, and shared `BUSINESS_NAME_MAX_LENGTH` authority.
2. **Owner onboarding V2** — current Staging routes Owner onboarding through `OwnerOnboardingWizardV2`; final frontend reconciliation must style/preserve that Product authority rather than reverting to the older wizard.

Invitation acceptance was separately compared and retains the token/password/action contract on the frontend candidate; its delta is presentation-oriented.

## PR / branch governance

Closed without merge as stale, superseded, or explicitly evidence-only:

- #571 — phone-bound WhatsApp consent; superseded by current Staging
- #544 — validation-only reconciled WhatsApp candidate
- #539 — authenticated UAT-only runner
- #519 — validation-only Blob certification
- #518 — diagnostic-only Blob certification branch
- #511 — validation-only WhatsApp first-run certification
- #503 — obsolete public Trial captured-email test PR; current Staging contains the newer 14-day receipt
- #500 — obsolete permanent Owner Trial E2E; current Staging contains the newer 14-day receipt
- #496 — temporary Staging integration validation

Do not automatically close or merge older Product candidate branches only because their bases are old. Diverged branches may contain unique historical work and require explicit reconciliation.

Active `main` frontend work, including PR #573, remains separate and must not be overwritten by backend/Staging closeout.

## Production / recovery gate

Production has not been mutated by this closeout.

Before a later Production launch, separately verify the final reconciled exact release SHA, Production database identity/migrations, Production backup/PITR retention and restore authority, environment/secret readiness, Production health/auth/tenant-isolation smoke, and explicit Owner authorization to promote.

A Staging PASS is never implicit Production authorization.

## Remaining blockers before GLOBAL PRE-STITCH FREEZE

The project may **not** yet be labeled `TANEE PRE-STITCH PRODUCT CLOSEOUT — COMPLETE`.

Remaining release-level gates:

1. approve/configure the legal publication identity and effective date, then certify the real Public Trial runtime;
2. obtain current controlled Email provider delivery evidence;
3. reconnect the intended Staging WhatsApp sender and complete live provider lifecycle evidence;
4. configure/certify Google Sheets if it remains enabled in final release scope;
5. run secure exact-SHA authenticated multi-role Staging UAT;
6. freeze the active frontend lane and reconcile the diverged frontend/main history with Staging while preserving the Product contracts above;
7. build one final reconciled candidate SHA and rerun complete exact-head source, CI, deployment, data, integration, and browser gates;
8. keep Production promotion as a separate explicit authorization after Production backup/PITR and preflight checks.

## Freeze statement

Backend/Staging currently has strong source, CI, database-integrity, tenant-isolation, deployment, and historical non-Production integration evidence, with no known code-level P0 identified in this closeout. That is **not** the same as global freeze.

Only after the remaining gates above are closed may the repository be labeled:

`TANEE PRE-STITCH PRODUCT CLOSEOUT — COMPLETE`

After that point Stitch may change presentation, responsive layout, identity, typography, and visual hierarchy, but must not silently redefine routes, permissions, loyalty economics, customer identity, reward truth, audience truth, integration contracts, server behavior, or the data model.
