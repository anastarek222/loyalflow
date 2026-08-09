# T004 Operational Readiness Audit

Date: 2026-08-09
Baseline: `main` after PR #50

## Scope

Audit and bounded operational-readiness evidence work for T004. Production access, provider mutation, deployment, secrets changes, schema changes, dependency changes, and production/staging database commands remain outside this slice unless separately approved.

## Existing foundations

LoyalFlow already has substantial operational safety material:

- `F19_INCIDENT_RESPONSE_RUNBOOK.md` defines incident severities, first-response steps, application rollback boundaries, database-incident handling, tenant-isolation handling, and recovery confirmation.
- `F19_BACKUP_RECOVERY_CHECKLIST.md` requires provider backup/PITR confirmation, retention documentation, an authorised restore owner, isolated recovery validation, and post-restore checks.
- `docs/OPERATIONS/P2_BACKUP_RESTORE_PROCEDURE.md` defines a disposable-local-only backup/restore exercise.
- `docs/OPERATIONS/P2_RPO_RTO_RUNBOOK.md` proposes RPO 15 minutes and RTO 30 minutes and correctly marks both as unverified production/service targets.
- `scripts/verify-p2-backup-restore-guard.ts` and `lib/server/database-script-guard.ts` provide fail-closed local/disposable safety boundaries.
- Existing release and operations scripts include `verify:production`, `verify:production-db`, `verify:production-smoke`, `verify:operations`, `release:production-preflight`, and final release gates.

## T004 gap analysis

### G02 — measured backup/restore evidence

**Partial evidence obtained.** An explicitly approved synthetic disposable-local PostgreSQL 18.4 exercise completed successfully on 2026-08-09. The recorded evidence includes backup/restore timestamps, a 1,891-byte backup artifact, SHA-256 checksum, 148 ms backup duration, 61 ms restore duration, and successful validation of three synthetic rows and markers.

Evidence is recorded in `docs/OPERATIONS/T004_DISPOSABLE_RECOVERY_EVIDENCE_2026-08-09.md`.

This closes the missing local procedural-execution evidence only. It does **not** establish production/service achieved RPO or RTO. The 15-minute RPO and 30-minute RTO remain proposed and unverified for production/service operation.

### Operational ownership

**Partial.** By explicit owner approval, Anas Tarek (`anastarek222`) is recorded as Primary Operational Owner for Incident Commander, Release Operator, Database Owner, Platform Owner, On-call Operator, and Security Owner. `Recovery Operator` and `Independent Reviewer` remain intentionally `UNASSIGNED` and must not be inferred.

The assignment itself does not grant database, production, provider, secrets, or deployment permissions.

### Staging isolation evidence

**Open.** Existing production guards and release scripts are strong, but there is still no reproducible evidence proving an isolated staging environment with a staging-only database identity, secrets boundary, and no production data access. Creating or mutating hosting/database environments requires separate approval.

### Monitoring and alert routing

**Partial.** LoyalFlow has public health endpoints, a Super Admin read-only operations centre, an operational snapshot verifier, and incident severity rules. These are useful observability foundations, but they are not proof of external uptime/error monitoring or delivered alert routing to an accountable operator.

### Rehearsed incident and rollback runbook

**Documented, not rehearsed.** The incident response and backup recovery documents are present and correctly separate application rollback from database recovery. There is no recorded tabletop/rehearsal evidence with timestamps, operator, release SHA, outcome, and corrective actions.

## Remaining smallest execution order

1. Preserve and independently review the sanitized disposable-local recovery evidence.
2. Assign a distinct Recovery Operator and Independent Reviewer, or formally define approved teams for those responsibilities.
3. Obtain separate approval before creating/changing staging or external monitoring/provider configuration.
4. Capture staging isolation evidence without production-data access.
5. Produce a delivered external test alert to the accountable on-call route.
6. Run a bounded incident/application-rollback tabletop or rehearsal and record timestamps/outcome.
7. Run normal code-quality gates for the T004 branch before Draft PR.
8. Close T004 only when all required evidence is reproducible and independently reviewed.

## Protected decisions / approvals still required

The completed disposable-local exercise does not authorise any broader database work. Separate approval is still required for:

- any production, staging, preview, shared, or remote database connection or command;
- migration execution against any environment;
- production or staging provider configuration;
- secrets or environment-variable changes;
- external monitoring/alert service configuration;
- production deployment.

## Current status

**NOT READY FOR DRAFT PR** for T004 closeout. Local disposable backup/restore execution evidence now exists, but Independent Reviewer/Recovery Operator assignment, staging isolation proof, monitoring/alert delivery evidence, rehearsal evidence, and normal branch gates remain unresolved.
