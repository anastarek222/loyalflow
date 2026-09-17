# Tanee / LoyalFlow — Pre-Stitch Closeout Manifest

Status: **ACTIVE — GLOBAL FREEZE BLOCKED**

Last reconciled: 2026-09-17

This document is the current authority for Product / Logic / Functional UX / Integration closeout before Stitch. It is **not** Production authorization. Production remains untouched unless the Owner explicitly authorizes a separate Production release step.

## 1. Current release authorities

- Production/default branch `main`: `75ee9fb1c4bd4561f58b3a902eb9f6eb49ee3482`.
- Integration branch `staging`: `7bf51c1f08d2c132cce17cb39ae45b9cfc436e8d`.
- Current Staging Vercel deployment: `dpl_vBuC3rgjb8AUc15ko21ekGAcuzSn`.
- Exact Staging deployment state: `READY`; Vercel commit status is `success`.
- Exact Staging runtime has served `GET /` with HTTP 200 and has no warning/error/fatal runtime logs observed after this deployment.
- Direct exact-SHA `/api/health/live` and authenticated browser UAT remain protected by Vercel Deployment Protection and must use the repository's secure encrypted handoff workflow rather than weakening protection.

### Main / Staging reconciliation gate

`main` and `staging` are currently diverged, not ancestor/descendant:

- `staging` has 360 commits not in `main`.
- `main` has 163 commits not in `staging`.
- merge base: `e09f92c54bb52d9fba32e43c488ca54c56a69b82`.

Therefore **GLOBAL PRE-STITCH FREEZE MUST NOT be declared yet**. The active frontend lane on `main` must freeze first, then one reconciled final release candidate must be built and re-certified. Do not directly merge `main` into `staging` or `staging` into `main` merely to remove the divergence counter.

## 2. Current source / CI authority

The current Staging source tree includes the merged legal-acceptance fix from PR #579 and the Meta Embedded Signup / WhatsApp staging fixes from PR #580.

Current-tree validation evidence from PR #580 is green:

- immutable migration manifest: PASS
- destructive migration scan: PASS
- Prisma validation: PASS
- disposable PostgreSQL migration rehearsal: PASS
- focused subscription tests: PASS
- full test suite: **2003 / 2003 PASS**
- TypeScript: PASS
- workspace boundaries: PASS
- lint: PASS
- production-style build: PASS
- Chromium browser smoke: PASS
- browser runtime receipts: PASS
- patch whitespace: PASS

The merge commit `7bf51c1...` has the same source tree as the validated PR #580 head; its additional commit is merge metadata only.

`Slice D Exact-SHA Runtime UAT` is intentionally separate from normal PR CI. It runs only through the dedicated trigger branch and encrypted handoff containing the Staging database access, disposable UAT password, and Vercel automation bypass secret. A normal `skipped` result is not a failure and is not runtime certification.

## 3. Staging database / data integrity

Read-only verification against the dedicated Neon Staging project currently shows:

- Prisma migration rows: 57
- unfinished migrations: 0
- rolled-back migrations: 0
- tenant-scope mismatches across ledger/customer/redemption/unlock/reversal relationships: 0
- tenant users without a Business: 0
- Super Admin users incorrectly attached to a Business: 0
- branch-assignment Business mismatches: 0
- orphan branches / branch assignments: 0
- customer balance reconciliation mismatches: 0
- lifetime earned reconciliation mismatches: 0
- lifetime redeemed reconciliation mismatches: 0
- invalid financial type/amount/reversal rows: 0
- duplicate Business-scoped loyalty idempotency keys: 0
- broken redemption-to-ledger links: 0
- broken redemption-to-unlock links: 0
- active stalled queries over 30 seconds: 0
- held database locks at inspection time: 0
- malformed used-before-created Owner Invitation timestamps: 0
- malformed Password Reset timestamps: 0
- malformed Email Verification timestamps: 0

Role topology at inspection time is also clean: one global Super Admin with no Business and two Business-scoped Owners.

## 4. Owner Trial / Email

### Closed in source

- Public Trial request parsing requires explicit Terms acceptance.
- Trial issuance binds acceptance to the currently published legal effective date.
- `PUBLIC_TRIAL` redemption now fails closed unless the invitation token carries a valid bound legal acceptance snapshot.
- Invitation tokens remain single-use / expiring according to the existing auth contract.
- Auth-email delivery remains fail-closed and uses the Resend delivery boundary in real runtime.
- CI's loopback email sink is reachable only when both `CI=true` and the private disposable harness flag are present.
- Auth email idempotency keys do not expose the email address or raw token.

### Trial duration authority

Current Product authority is:

`TRIAL_DURATION_DAYS = 14`

The Trial window is fourteen days. Older seven-day references are historical evidence only and are not current Product authority.

### Open external/runtime gates

Public Trial runtime is currently blocked by legal publication configuration. A legal profile is considered published only when all five values are valid:

- `NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS=published`
- `NEXT_PUBLIC_LEGAL_ENTITY_NAME`
- `NEXT_PUBLIC_LEGAL_COUNTRY`
- `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`
- `NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE` in `YYYY-MM-DD`

No placeholder legal identity should be invented to clear this gate. Until the approved legal identity/effective date are supplied, `/get-started` must remain fail-closed.

Email provider delivery also remains **OPEN for the current final candidate**. Source/tests are green, but this closeout does not claim a fresh controlled external provider-delivery receipt for the current exact Staging release.

## 5. WhatsApp V1

### Closed in source / CI

The current Staging source contains the Business-scoped WhatsApp V1 architecture and six customer-message events:

- Welcome
- Balance Updated
- Reward Ready
- Reward Redeemed
- New Reward
- New Offer

Current source enforces:

- Business-scoped credentials and sender identity
- explicit customer consent
- STOP / opt-out authority
- current-phone consent binding
- invalidation of stale consent after a customer phone change
- atomic current-phone reconfirmation that cannot override STOP
- durable Business-scoped outbox jobs
- queue idempotency and worker leases
- per-event automation controls and Global Pause
- provider-owned template approval state
- Business-scoped product readiness
- manual and automatic delivery through the same durable delivery authority
- Meta Embedded Signup client-origin validation
- CSP / popup policy required for the official Meta SDK without making the application frameable

The obsolete phone-consent PR #571 was closed without merge because its core consent-state implementation is already present in current Staging, while current Staging additionally contains newer entitlement and Reward Redeemed handling.

### Current Staging provider state

Read-only Staging data currently shows:

- connected `BusinessWhatsAppCredential` rows: **0**
- current approved template bindings: **3**
- approved bindings are Arabic `WELCOME`, `BALANCE_UPDATED`, and `REWARD_READY`
- no current connected WABA/sender credential

Therefore WhatsApp provider certification remains **OPEN / BLOCKED on reconnect and live provider evidence**. A complete gate requires the intended Staging sender to be connected and real provider evidence for accepted send plus lifecycle/webhook processing. Historical 401/provider failures are not current exact-head success evidence.

## 6. Workers / Queue / Outbox

Current source uses Vercel Queue for integration wake-ups and PostgreSQL as the durable job authority.

Source/CI authority includes:

- job-id-only queue messages
- queue idempotency key derived from job ID
- atomic PostgreSQL claim lease
- bounded retry policy with maximum three attempts
- non-retryable failures terminate as `DEAD`
- bounded stranded-job reconciliation
- bounded recovery heartbeat without an immortal scheduling chain

Current Staging durable state is clean:

- `PENDING`: 0
- `FAILED`: 0
- `PROCESSING`: 0
- currently eligible stranded jobs: 0

Historical Staging runtime proves the queue worker has executed real Google Sheets and WhatsApp jobs, including fail-closed non-retryable outcomes. The current exact `7bf51c1...` deployment has not yet produced a new queue-callback execution receipt, so **exact-head Queue execution remains OPEN even though source/CI/durable state are clean**.

## 7. Google Sheets

Google Sheets integration is source-safe and fail-closed, but current Staging runtime is not fully configured.

Current observed failure is `MISSING_SPREADSHEET_ID`, referring to the global runtime `GOOGLE_SPREADSHEET_ID` configuration required by the integration. This is an environment readiness blocker, not a data-corruption finding.

Current status: **BLOCKED ON ENVIRONMENT CONFIGURATION** if Google Sheets is intended to be enabled for the final Staging candidate.

## 8. Custom Card / Vercel Blob

Current source / CI covers:

- private Custom Card Blob storage
- tenant-scoped paths
- bounded Front + Back upload size
- strict image-container validation
- private readback
- explicit not-found versus provider/auth/storage failure behavior
- paginated retained-artwork listing

Current Staging data contains a real managed Vercel Blob Front + Back pair for an enabled Custom Card Business.

Historical non-Production external certification is also closed and preserved in prior evidence: an isolated private Preview Blob object was uploaded, read through the actual Product readback helper, and deleted; cleanup was verified and the final safe diagnostic removed the mutating certification route.

The current exact `7bf51c1...` protected deployment has not repeated an HTTP Blob readback because ordinary tooling is stopped by Vercel Deployment Protection. This distinction must remain explicit:

- live non-Production Blob capability: **previously certified PASS**
- current source / CI: **PASS**
- current exact-SHA protected HTTP readback: **not repeated in this closeout**

## 9. Roles / permissions / tenant isolation

Source authority covers Super Admin, Owner, Manager, Staff, and Viewer separately from UI visibility.

Current read-only Staging data confirms no detected cross-Business topology mismatch in users, branches, assignments, loyalty ledger, rewards, redemptions, unlocks, or reversals.

Normal CI browser smoke is green, but a final authenticated multi-role exact-SHA Staging UAT must use the secure handoff workflow before this gate is marked fully runtime-certified on the final reconciled release candidate.

## 10. PR / branch governance

The following stale or evidence-only PRs have been closed without merge because their purpose is complete or their source is superseded:

- #571 — phone-bound WhatsApp consent fix; superseded by current Staging source
- #544 — validation-only reconciled WhatsApp candidate
- #539 — temporary authenticated UAT-only runner
- #519 — validation-only Blob isolation certification
- #511 — validation-only WhatsApp first-run certification
- #496 — temporary Staging integration validation

Do not automatically close or merge old Product candidate branches merely because they target an old Staging base. Some are diverged and may contain unique historical work; they require explicit reconciliation.

Active `main` frontend work remains separate, including the current frontend-foundation lane. It must not be overwritten from Staging during backend closeout.

## 11. Production / recovery gate

Production has not been mutated by this closeout.

Before any later Production launch, separately verify:

- the final reconciled exact release SHA
- Production database identity and migration status
- Production backup / PITR availability and retention
- restore authority and isolated restore rehearsal policy
- Production environment and secret readiness
- Production health/auth/tenant-isolation smoke
- explicit Owner authorization to promote

A Staging PASS is never implicit Production authorization.

## 12. Remaining blockers before GLOBAL PRE-STITCH FREEZE

The project may **not** yet be labeled `TANEE PRE-STITCH PRODUCT CLOSEOUT — COMPLETE`.

The remaining release-level gates are:

1. approve and configure the legal publication identity/effective date, then certify the real Public Trial runtime;
2. obtain current controlled Email provider delivery evidence;
3. reconnect the intended Staging WhatsApp sender and complete live provider lifecycle evidence;
4. configure/certify Google Sheets if it is enabled for the final release scope;
5. run secure exact-SHA authenticated multi-role Staging UAT through the encrypted handoff workflow;
6. reconcile the diverged `main` and `staging` histories only after the active frontend lane freezes;
7. build one final reconciled candidate SHA and rerun the complete exact-head source, CI, deployment, data, integration and browser gates;
8. keep Production promotion as a separate explicit authorization after Production backup/PITR and preflight checks.

## Freeze statement

Backend/Staging currently has strong source, CI, database-integrity, tenant-isolation and deployment evidence, with no known code-level P0 found in this closeout. That is **not** the same as a global freeze.

Only after the remaining gates above are closed may the repository be labeled:

`TANEE PRE-STITCH PRODUCT CLOSEOUT — COMPLETE`

After that point Stitch may change presentation, responsive layout, identity, typography and visual hierarchy, but must not silently redefine routes, permissions, loyalty economics, customer identity, reward truth, audience truth, integration contracts, server behavior or the data model.
