# T004 Operational Readiness Evidence

Status: **OPEN — evidence collection in progress**

This file is the repository-owned summary for T004. It must not imply that a control is achieved before the corresponding evidence is recorded and reviewable.

## Safety boundary

This summary does not authorize any database connection, backup, restore, provider mutation, production/staging access, secret or environment change, monitoring-service configuration, or deployment.

## 1. Backup and restore drill

Current state: **MEASURED LOCALLY / PRODUCTION RPO-RTO UNVERIFIED**

Planning targets only:

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

## 2. Operational ownership

Current state: **PARTIAL**

The authoritative assignment matrix is `T004_OPERATIONAL_OWNERSHIP.md`.

Explicitly assigned to Anas Tarek (`anastarek222`): Incident Commander, Release Operator, Database Owner, Recovery Operator, Platform Owner, On-call Operator, and Security Owner.

Still open:

- Independent Reviewer: `UNASSIGNED`.
- Backup/alternate owners remain unresolved where continuity requires them.

Do not infer or invent a person for an open role.

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

Current state: **PARTIAL — external alert delivery not verified**

Repository review confirms that `/api/health` is suitable as an uptime/readiness monitor target because it performs a real database readiness probe and returns HTTP `503` with `status: "unavailable"` when the probe fails. The endpoint is dynamic and marked `Cache-Control: no-store`, so a monitor will not be satisfied by a stale cached success response.

The repository and Vercel evidence also show Runtime Logs, Observability surfaces, and incident runbooks. They do not establish a configured external alert policy or delivered alert to an accountable recipient.

Still required before T004 closeout:

- External uptime/error monitoring or an approved equivalent configured for the intended environment.
- Primary target: `/api/health`.
- Trigger condition should include timeout/network failure or non-2xx response, including the readiness `503` path.
- Alert severity mapped to the incident runbook.
- Accountable recipient: current On-call Operator, Anas Tarek (`anastarek222`), without storing private contact data in the repository.
- Sanitized test-alert or equivalent routing verification with timestamp and outcome.
- No API key, webhook secret, private contact detail, or provider credential committed.

Configuration of a provider or external monitoring service remains a separately controlled provider mutation and is not authorized by this document.

## 5. Incident and rollback rehearsal

Current state: **TABLETOP REHEARSAL RECORDED**

`T004_TABLETOP_REHEARSAL_2026-08-09.md` records the bounded tabletop exercise. It checks application rollback separately from database recovery and reviews the incident decision path without claiming a live production rollback.

## Closeout rule

T004 remains open until all required closeout evidence is resolved. Current unresolved items are principally:

1. Production/service RPO/RTO remain unverified; local procedure timings must not be promoted to production targets achieved.
2. Independent Reviewer is named and reviews the evidence.
3. External monitoring/alert routing is configured and delivery is verified.
4. Required continuity/back-up ownership is resolved or explicitly accepted by the accountable owner.

Until then, the valid completion status is **NOT READY FOR DRAFT PR** for T004 closeout.
