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

**Local procedural evidence verified.** An explicitly approved synthetic disposable-local PostgreSQL 18.4 exercise completed successfully on 2026-08-09.

Latest recorded execution evidence:

- backup duration: 95 ms;
- restore duration: 53 ms;
- backup artifact size: 1,891 bytes;
- SHA-256: `7af650eb586058aaf60bee1f476d34e1f1c1b41f9e44de4fc072c12d8192e4b2`;
- validated rows: 3;
- validated markers: `alpha,beta,gamma`;
- source and restore databases were generated disposable local `_test` databases on `127.0.0.1:5432`.

Evidence is recorded in `docs/OPERATIONS/T004_DISPOSABLE_RECOVERY_EVIDENCE_2026-08-09.md`.

This closes the missing local procedural-execution evidence only. It does **not** establish production/service achieved RPO or RTO. The 15-minute RPO and 30-minute RTO remain proposed and unverified for production/service operation.

### Production recovery posture

**Provider-native recovery posture verified read-only; achieved RPO/RTO not measured.** With explicit owner approval, Neon project metadata was inspected without running SQL, creating a restore branch, changing configuration, or accessing customer data.

Verified provider evidence establishes:

- the production Neon branch is the primary/default branch and is `ready`;
- project history retention is `21600` seconds (6 hours);
- provider-native retained-history/PITR capability is therefore present within the provider retention window;
- no production restore exercise was executed.

Evidence is recorded in `docs/OPERATIONS/T004_PRODUCTION_RECOVERY_POSTURE_EVIDENCE_2026-08-09.md`.

This closes the missing production recovery-capability/posture check. It does **not** prove that the proposed 15-minute RPO or 30-minute RTO has been achieved in practice; those service objectives still require a separately approved measured production-grade recovery exercise or an explicit decision to defer measured proof to the launch gate.

### Operational ownership

**Substantially assigned; independent review intentionally deferred.** By explicit owner approval, Anas Tarek (`anastarek222`) is recorded as Incident Commander, Release Operator, Database Owner, Recovery Operator, Platform Owner, On-call Operator, and Security Owner.

`Independent Reviewer` remains intentionally `UNASSIGNED` after the owner chose to defer that assignment. It must not be inferred or silently self-assigned.

These assignments do not grant database, production, provider, secrets, or deployment permissions.

### Staging / Preview isolation evidence

**Verified for the current Preview boundary.** Provider and runtime evidence establish that:

- Production retains a Production-only `DATABASE_URL`;
- Preview uses a separately provisioned Neon PostgreSQL non-production resource;
- the Neon connection is scoped to Preview only and excludes Production;
- Preview database branching is enabled;
- a fresh Preview deployment succeeded after the Neon connection;
- `/api/health` returned `status: "ready"` and `environment: "preview"` for release lineage `51dbc65...`.

Evidence is recorded in `docs/OPERATIONS/T004_VERCEL_ENVIRONMENT_EVIDENCE_2026-08-09.md`.

This verifies the Preview isolation and application-level environment identity requirements covered by T004. It does not authorise migrations or other database commands against the Preview Neon resource.

### Monitoring and alert routing

**Verified.** The owner explicitly approved bounded external monitoring configuration for the LoyalFlow health endpoint. Vercel native Alerts were observed to require a Pro plan, so a separate UptimeRobot HTTP/S monitor was configured instead.

Verified evidence now establishes:

- production target: `https://loyalflow-gray.vercel.app/api/health`;
- external provider: UptimeRobot;
- check interval: 5 minutes;
- monitor state: `Up` with 100% uptime at capture time;
- notification route: account-associated e-mail channel for the accountable On-call Operator, with the private address intentionally omitted from repository evidence;
- UptimeRobot built-in test notification reported `Test notification sent`;
- end-to-end receipt of both synthetic `TEST: Monitor is DOWN` and `TEST: Monitor is UP` messages was demonstrated on the operator's device.

Read-only verification of the production health target returned HTTP `200`, `service: "loyalflow"`, `status: "ready"`, and `environment: "production"`. Repository behavior also ensures readiness failure returns HTTP `503`.

Evidence is recorded in `docs/OPERATIONS/T004_EXTERNAL_MONITORING_EVIDENCE_2026-08-09.md`.

This closes the external monitoring and alert-delivery gap without requiring a real production outage.

### Rehearsed incident and rollback runbook

**Tabletop rehearsal completed.** A documentation-only incident/application-rollback rehearsal was recorded on 2026-08-09 with Anas Tarek as Incident Commander.

The rehearsal passed the documented decision path and confirmed separation between application rollback and database recovery, including explicit stop conditions for destructive database commands.

Evidence is recorded in `docs/OPERATIONS/T004_TABLETOP_REHEARSAL_2026-08-09.md`.

This is not a live production rollback and does not establish measured production recovery time.

## Remaining smallest execution order

1. Decide whether measured production/service RPO/RTO proof is mandatory for T004 closeout or explicitly defer measured proof to the later launch gate now that provider-native recovery posture is verified.
2. Resolve continuity/back-up ownership or explicitly accept the current single-owner operational posture for T004.
3. Keep the Independent Reviewer assignment deferred until the owner supplies a real reviewer; do not infer one.
4. Reconfirm exact-current-head standalone typecheck and lint before Draft PR.
5. Reconcile the master tracker with the final T004 closeout decision.
6. Close T004 only when the required evidence is reproducible and no mandatory closeout gate remains unresolved.

## Protected decisions / approvals still required

The completed disposable-local exercise, read-only production recovery-posture verification, Preview evidence, and external-monitoring configuration do not authorise broader database or provider work. Separate approval is still required for:

- any production, staging, preview, shared, or remote database command;
- migration execution against any environment;
- production database restore action or backup/PITR configuration mutation;
- secrets or environment-variable changes;
- production deployment.

## Current status

**NOT READY FOR DRAFT PR** for T004 closeout.

Verified evidence now includes disposable-local backup/restore execution, provider-native production recovery posture, Preview environment isolation/runtime identity, named Recovery Operator, bounded incident/rollback tabletop, end-to-end external monitoring alert delivery, 765/765 tests, and a successful local production build. Remaining closeout decisions are measured production/service RPO-RTO treatment, continuity/back-up ownership, Independent Reviewer assignment, and exact-head standalone typecheck/lint reconfirmation.