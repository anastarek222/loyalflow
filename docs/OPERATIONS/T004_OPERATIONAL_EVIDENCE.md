# T004 Operational Readiness Evidence

Status: **OPEN — independent review still pending**

This file is the repository-owned summary for T004. It must not imply that a control is achieved before the corresponding evidence is recorded and reviewable.

## Safety boundary

This summary does not authorize any database connection, backup, restore, provider mutation, production/staging access, secret or environment change, monitoring-service configuration, or deployment.

## 1. Backup and restore drill

Current state: **LOCAL RESTORE MEASURED / PRODUCTION PROVIDER PITR POSTURE VERIFIED READ-ONLY / MEASURED PRODUCTION RPO-RTO DEFERRED TO LAUNCH GATE**

Planning targets remain:

- Proposed RPO: 15 minutes.
- Proposed RTO: 30 minutes.
- Achieved production/service RPO: unknown and unverified.
- Achieved production/service RTO: unknown and unverified.

Sanitized disposable-local evidence is recorded in `T004_DISPOSABLE_RECOVERY_EVIDENCE_2026-08-09.md`.

Latest successful repeat:

- PostgreSQL client/server: 18.4 / 18.4.
- Local host: `127.0.0.1:5432`.
- Source and restore database identities ended in `_test`.
- Backup duration: `95 ms`.
- Backup artifact size: `1891 bytes`.
- Backup SHA-256 recorded in the evidence file.
- Restore duration: `53 ms`.
- Restored validation: 3 synthetic rows, markers `alpha,beta,gamma`.
- Result: `PASS`.

These timings validate the guarded local procedure only. They are not production RPO/RTO evidence.

Read-only Production-provider evidence is recorded in `T004_PRODUCTION_RECOVERY_POSTURE_EVIDENCE_2026-08-09.md` and establishes:

- The Production Neon project is on PostgreSQL 18 and reports a 6-hour (`21600` second) history-retention window.
- The `production` branch is the primary/default branch and was `ready` at verification time.
- Neon retained history supports provider-native point-in-time recovery within the configured retention window.
- No restore, snapshot, branch, SQL/data query, migration, secret, or provider configuration mutation was performed.

This verifies Production recovery **capability/posture**, but it does not convert the proposed 15-minute RPO or 30-minute RTO into achieved targets. A retention window is not a measured recovery point, and no Production restore timing was exercised.

On 2026-08-09 the accountable owner explicitly chose to defer a measured Production/service RPO-RTO exercise to the public-launch readiness gate rather than run a Production restore exercise during T004. Therefore T004 may carry this as a documented launch-gate dependency; P11/T008 must not treat the 15-minute/30-minute targets as achieved until measured evidence exists.

## 2. Operational ownership

Current state: **PRIMARY OWNERSHIP ASSIGNED / TEMPORARY SINGLE-OWNER CONTINUITY POSTURE ACCEPTED / INDEPENDENT REVIEWER OPEN**

The authoritative assignment matrix is `T004_OPERATIONAL_OWNERSHIP.md`.

Explicitly assigned to Anas Tarek (`anastarek222`): Incident Commander, Release Operator, Database Owner, Recovery Operator, Platform Owner, On-call Operator, and Security Owner.

On 2026-08-09 the accountable owner explicitly accepted a temporary single-owner continuity posture for T004 closeout. Backup/alternate owners therefore remain `UNASSIGNED` by deliberate risk acceptance, not by accidental omission. This does not create redundancy and must be revisited before public launch or earlier if another qualified operator becomes available.

Still open:

- Independent Reviewer: `UNASSIGNED`.

Do not infer or invent a reviewer.

## 3. Staging / Preview isolation

Current state: **VERIFIED FOR PREVIEW ISOLATION**

Sanitized provider/runtime evidence is recorded in `T004_VERCEL_ENVIRONMENT_EVIDENCE_2026-08-09.md` and establishes:

- Production retains a Production-only `DATABASE_URL` entry.
- Preview uses a separately provisioned Neon PostgreSQL resource.
- The Neon connection was scoped to Preview only; Production was excluded.
- Preview database branching is enabled.
- No production customer data was intentionally copied during the provisioning flow.
- A fresh Preview deployment completed successfully.
- `/api/health` reported `environment: "preview"` and `status: "ready"` for the verified release lineage.

This closes the T004 Preview/staging isolation requirement covered by the recorded provider and runtime evidence.

## 4. Monitoring and alert routing

Current state: **VERIFIED — external monitor and alert delivery confirmed**

Repository review confirms that `/api/health` is suitable as an uptime/readiness monitor target because it performs a real database readiness probe and returns HTTP `503` with `status: "unavailable"` when the probe fails. The endpoint is dynamic and marked `Cache-Control: no-store`, so a monitor will not be satisfied by a stale cached success response.

Sanitized external-monitoring evidence is recorded in `T004_EXTERNAL_MONITORING_EVIDENCE_2026-08-09.md` and establishes:

- UptimeRobot HTTP/S monitor configured against `https://loyalflow-gray.vercel.app/api/health`.
- Check interval: 5 minutes.
- Account-associated e-mail notification channel enabled for the accountable On-call Operator; the private address is not stored in the repository.
- Provider UI showed the monitor `Up` and 100% uptime at the time of capture.
- UptimeRobot built-in test notification was sent.
- User-supplied delivery evidence showed both synthetic `TEST: Monitor is DOWN` and `TEST: Monitor is UP` notifications received through Gmail.

This closes the external uptime monitoring and end-to-end alert-delivery evidence gap without requiring a real production outage.

## 5. Incident and rollback rehearsal

Current state: **TABLETOP REHEARSAL RECORDED**

`T004_TABLETOP_REHEARSAL_2026-08-09.md` records the bounded tabletop exercise. It checks application rollback separately from database recovery and reviews the incident decision path without claiming a live production rollback.

## 6. Build and code-quality verification

Current state: **QUALITY GATES VERIFIED FOR THE CURRENT BRANCH HEAD USED BY LOCAL CHECKS**

Recorded local evidence on 2026-08-09:

- `pnpm run typecheck`: PASS on branch head after fast-forward to `0f156c4...`; `tsc --noEmit` completed with no errors.
- `pnpm run lint`: PASS on the same branch head with 0 errors and 2 pre-existing warnings in `app/account/security/actions.ts` for unused `_previousState` and `_formData` parameters.
- `pnpm test`: PASS on commit `fcadb62ba0a7fbbf48da8c45c88c38419cf73f1d`: 765/765 tests, 0 failures.
- `pnpm run build`: PASS on the same runtime/test tree after applying a process-scoped temporary `NEXT_PUBLIC_APP_URL=https://loyalflow-gray.vercel.app`; no `.env.local` or provider environment setting was changed. Prisma Client generation succeeded, Next.js 16.2.11 compiled successfully, TypeScript finished successfully, page data collection succeeded, and 26/26 static pages were generated.

The branch changes after `fcadb62...` were documentation-only, so the successful test/build evidence continues to cover the unchanged runtime and test tree. The latest standalone typecheck/lint commands were run after pulling those documentation commits and therefore confirm the current branch head's TypeScript and ESLint state.

The prior local build failure was caused only by an invalid local `NEXT_PUBLIC_APP_URL` value loaded from `.env.local`; it was not a source-code compilation failure. The successful rerun used a one-command environment override only.

Vercel deployment `dpl_9uDe2bLke9wcs1rVEaMJrbhKP6Np` for commit `d4df2502078d409f0a2e2cc9aa3404606296e2f3` also completed successfully and generated all 26 static pages.

## Closeout rule

T004 has resolved its technical evidence, Production recovery-posture, monitoring, Preview isolation, primary ownership, temporary continuity posture, and quality-gate items. Measured Production/service RPO-RTO is explicitly deferred to the public-launch gate and is not claimed as achieved.

The remaining T004 closeout blocker is:

1. Independent Reviewer is named and reviews the sanitized evidence, if independent review remains a mandatory T004 completion requirement.

Until that review requirement is resolved, the valid completion status is **NOT READY FOR DRAFT PR**.