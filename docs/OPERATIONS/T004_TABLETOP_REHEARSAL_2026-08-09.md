# T004 Incident / Rollback Tabletop Rehearsal

Date: 2026-08-09
Type: Documentation-only tabletop rehearsal
Environment impact: None
Database impact: None
Production impact: None

## Scenario

A newly deployed application release causes a material authentication regression for valid users. There is no evidence of database corruption, tenant data leakage, or loyalty-ledger corruption.

## Accountable role used

Incident Commander: Anas Tarek (`anastarek222`)

This rehearsal records decision flow only. It does not grant any additional production, hosting, database, or secret access.

## Rehearsed response

1. Declare the incident and stop further deployment activity.
2. Record the currently deployed release SHA before any rollback decision.
3. Classify the incident as application-layer unless evidence shows a database, tenant-isolation, or provider failure.
4. Use the public health/readiness checks and the read-only operational snapshot to confirm scope.
5. Prefer application rollback when the regression is tied to the new release.
6. Keep database migration history intact; do not use `prisma migrate reset`, `prisma migrate dev`, or `prisma db push` as rollback shortcuts.
7. Do not initiate database restore unless a separately authorised database incident is confirmed.
8. After application rollback, verify health endpoints, authentication, tenant isolation, a disposable loyalty operation exactly once, public-card privacy, and final release identity.
9. Record corrective actions before incident closure.

## Decision checkpoints

- If cross-tenant exposure is suspected, escalate as Critical and restrict access or rollback immediately.
- If duplicate or incorrect loyalty writes are suspected, preserve transaction/activity records and do not delete transactions to make balances appear correct.
- If application rollback does not restore service, stop and escalate to the relevant Platform/Database/Security owner rather than improvising destructive recovery.

## Outcome

Tabletop result: PASS for documented decision-path consistency.

The rehearsal confirms that the current runbooks preserve the separation between application rollback and database recovery and include explicit destructive-command stop conditions. No command, deployment, provider mutation, or database operation was executed.

## Limitations

This is not a live incident drill, not a production rollback, and not evidence of measured recovery time. It does not close staging-isolation, external-monitoring, or independent-review requirements.
