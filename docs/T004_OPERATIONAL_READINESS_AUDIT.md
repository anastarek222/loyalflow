# T004 Operational Readiness Audit

Date: 2026-08-09
Baseline: `main` after PR #50

## Scope

Read-only audit of the current operational-readiness foundations. No database command, backup, restore, production access, provider mutation, deployment, secret change, schema change, dependency change, or environment change was performed.

## Existing foundations

LoyalFlow already has substantial operational safety material:

- `F19_INCIDENT_RESPONSE_RUNBOOK.md` defines incident severities, first-response steps, application rollback boundaries, database-incident handling, tenant-isolation handling, and recovery confirmation.
- `F19_BACKUP_RECOVERY_CHECKLIST.md` requires provider backup/PITR confirmation, retention documentation, an authorised restore owner, isolated recovery validation, and post-restore checks.
- `docs/OPERATIONS/P2_BACKUP_RESTORE_PROCEDURE.md` defines a disposable-local-only backup/restore exercise and explicitly states that no exercise has been executed or measured.
- `docs/OPERATIONS/P2_RPO_RTO_RUNBOOK.md` proposes RPO 15 minutes and RTO 30 minutes but explicitly marks both as unverified.
- `scripts/verify-p2-backup-restore-guard.ts` and `lib/server/database-script-guard.ts` provide a fail-closed metadata preflight for a localhost disposable PostgreSQL database ending in `_test`; the wrapper never executes backup or restore tools.
- Existing release and operations scripts include `verify:production`, `verify:production-db`, `verify:production-smoke`, `verify:operations`, `release:production-preflight`, and final release gates.

## T004 gap analysis

### G02 — measured backup/restore evidence

**Open.** The repository contains procedure and guard rails, but no measured backup artifact, checksum, restore execution, validation result, recovery point, or recovery duration. The current runbook correctly states that achieved RPO/RTO are unknown.

Closing this gap requires an explicitly approved database exercise against a named disposable local test database. That approval is not implied by this audit.

### Operational ownership

**Open.** The backup checklist says to record who is authorised to initiate a restore, but the repository does not establish named operational roles/owners for incident commander, deployment rollback, database recovery, and provider escalation. T004 exit evidence requires named operational owners or an explicit owner-role mapping.

### Staging isolation evidence

**Open.** Existing production guards and release scripts are strong, but this audit found no reproducible evidence proving an isolated staging environment with a staging-only database identity, secrets boundary, and no production data access. Creating or mutating hosting/database environments is outside the safe audit scope.

### Monitoring and alert routing

**Partial.** LoyalFlow has public health endpoints, a Super Admin read-only operations centre, an operational snapshot verifier, and incident severity rules. These are useful observability foundations, but they are not proof of external uptime/error monitoring or an alert-delivery route to an accountable operator.

### Rehearsed incident and rollback runbook

**Documented, not rehearsed.** The incident response and backup recovery documents are present and correctly separate application rollback from database recovery. There is no recorded tabletop/rehearsal evidence with timestamps, operator, release SHA, outcome, and corrective actions.

## Recommended smallest execution order

1. Add a repository-owned T004 evidence template and named operational role matrix without external mutations.
2. Add deterministic tests that ensure the operational documents keep critical safety requirements and do not claim unverified RPO/RTO as achieved.
3. Run normal code-quality gates for that documentation/test slice.
4. Stop for explicit approval before any disposable database backup/restore exercise.
5. Separately stop for explicit approval before creating or changing staging/provider monitoring configuration.
6. After approved exercises, record sanitized measured evidence and close T004 only when all required exit evidence exists.

## Protected decisions / approvals still required

The following are not authorised by starting T004:

- any database connection or command, including `pg_dump`, restore tooling, validation queries, migration status against a live database, or disposable-database preparation;
- any production or staging provider configuration;
- any secrets or environment-variable changes;
- any external monitoring/alert service configuration;
- any production deployment.

## Current status

**NOT READY FOR DRAFT PR** for T004 closeout. The audit itself is safe and complete, but T004 cannot be marked complete until measured recovery evidence, operational ownership, staging isolation proof, monitoring/alert evidence, and rehearsal evidence are resolved.