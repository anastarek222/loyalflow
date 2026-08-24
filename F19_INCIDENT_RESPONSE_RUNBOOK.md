# LoyalFlow Incident Response Runbook

This runbook is for operational incidents after deployment. It does not grant
permission to bypass tenant isolation or modify migration history.

## Severity

### Critical

Treat as critical when any of these are observed:

- authentication is unavailable for valid users
- tenant data can cross business boundaries
- loyalty earn/redeem correctness is uncertain
- duplicate loyalty writes are occurring
- production readiness is unavailable
- all configured businesses appear unavailable unexpectedly

### High

Treat as high when:

- a material subset of businesses cannot operate
- Scan is unavailable while other application areas remain usable
- public cards are unavailable
- subscription state incorrectly suspends active customers

### Operational attention

Examples:

- overdue subscription backlog
- isolated integration degradation
- one tenant configuration issue
- optional Google Sheets failure

## First response

1. Stop new deployment activity.
2. Record the exact deployed Git SHA.
3. Run the public health smoke check.
4. Run the read-only operational snapshot.
5. Confirm the exact production database identity before any database command.
6. Determine whether the incident is application, database, configuration, or provider related.

Commands:

```bash
pnpm run verify:production-smoke
pnpm run verify:operations
pnpm run verify:production-db
```

Do not paste secrets or raw connection strings into incident notes.

## Monitoring and alerting

`F19_MONITORING_ALERTING_POLICY.md` defines the liveness/readiness thresholds,
launch-critical correctness signals, escalation levels, and the requirements
for external alert delivery. Use the alert's environment and exact deployed Git
SHA to distinguish the active release from stale Preview deployments before
starting remediation.

An alert is evidence to investigate, not permission to bypass database or
tenant safety guards.

## Application rollback

Rollback the application deployment first when the regression is tied to a new
release.

Keep the database migration history intact. Do not run:

```text
prisma migrate reset
prisma migrate dev
prisma db push
```

Do not manually delete migration records to force an application rollback.

## Database incident

Before any production database action:

```bash
pnpm run verify:production-db
```

Prefer provider-native backups/restore points and a documented recovery plan.
Never restore a production backup over another environment without verifying
the target first.

## Tenant isolation incident

If cross-tenant exposure is suspected:

1. Treat the incident as critical.
2. Restrict application access or rollback immediately.
3. Preserve logs and the exact release SHA.
4. Do not run broad repair scripts before the affected tenant scope is known.
5. Verify server authorization paths before restoring service.

## Loyalty-write incident

If duplicate or incorrect earn/redeem writes are suspected:

1. Stop or rollback the release causing the issue.
2. Preserve transaction and activity records.
3. Do not delete transactions to make balances appear correct.
4. Use existing audit records to determine the affected operation IDs,
   customers, actors, and branches.
5. Apply any correction through an explicit auditable adjustment workflow.

## Recovery confirmation

Before closing an incident:

- `/api/health/live` is healthy
- `/api/health` is ready
- authentication works
- tenant isolation is verified
- one disposable Scan earn/redeem flow succeeds exactly once
- public enrolment/card privacy is intact
- operational snapshot is not critical
- the final deployed Git SHA is recorded
