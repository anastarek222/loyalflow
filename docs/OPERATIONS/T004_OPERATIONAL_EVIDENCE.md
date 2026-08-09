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

Historical T004 quality evidence was recorded on the legacy T004 branch: 765/765 tests and a successful production build, with standalone typecheck/lint passing. Because T004 is now being reconciled onto `main` after merged T005 changes, those historical checks are evidence only and **must not be treated as current-head verification**. Current reconciliation gates must be rerun before Draft PR readiness.

## Closeout rule

T004 has resolved its technical operational evidence, Production recovery-posture, monitoring, Preview isolation, primary ownership, temporary continuity posture, and local recovery procedure evidence. Measured Production/service RPO-RTO is explicitly deferred to the public-launch gate and is not claimed as achieved.

The remaining T004 closeout blockers are:

1. Re-run current-head quality gates after reconciliation with `main`.
2. Independent Reviewer is named and reviews the sanitized evidence, if independent review remains a mandatory T004 completion requirement, or the owner records a separate explicit governance exception for T004.

Until those items are resolved, the valid completion status is **NOT READY FOR DRAFT PR**.
