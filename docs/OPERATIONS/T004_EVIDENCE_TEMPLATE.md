# T004 Operational Readiness Evidence Template

Use this file only to record sanitized evidence from an explicitly authorised operational exercise. A blank or partially completed template is not completion evidence.

## Evidence status

- State: `NOT_EXECUTED`
- Exercise date: `UNSET`
- Operator: `UNASSIGNED`
- Reviewer: `UNASSIGNED`
- Release SHA: `UNSET`
- Environment: `UNSET`

Allowed state progression is `NOT_EXECUTED` -> `EXECUTED_UNVERIFIED` -> `VERIFIED`. Do not set `VERIFIED` unless every required item below has reproducible evidence.

## Backup evidence

- Approved disposable target identifier: `UNSET`
- Approval reference: `UNSET`
- Backup start UTC: `UNSET`
- Backup finish UTC: `UNSET`
- Artifact size: `UNSET`
- Artifact checksum algorithm/value: `UNSET`
- Storage failure-domain separation: `UNVERIFIED`
- Sanitized preflight result: `UNSET`

Do not record credentials, connection strings, tokens, passwords, customer data, or raw production identifiers.

## Restore evidence

- Approved isolated restore target identifier: `UNSET`
- Restore preparation start UTC: `UNSET`
- Restore execution start UTC: `UNSET`
- Restore execution finish UTC: `UNSET`
- Validation finish UTC: `UNSET`
- Validation criteria reference: `UNSET`
- Validation result: `UNVERIFIED`

## Recovery measurements

The repository currently proposes an RPO target of 15 minutes and an RTO target of 30 minutes. These are targets, not achieved values.

- Measured recovery point: `UNVERIFIED`
- Calculated achieved RPO: `UNVERIFIED`
- Calculated achieved RTO: `UNVERIFIED`
- Target comparison result: `UNVERIFIED`

Never convert a proposed target into an achieved claim without timestamped exercise evidence and independent review.

## Staging isolation evidence

- Staging environment identifier: `UNSET`
- Staging database identity evidence: `UNVERIFIED`
- Production database access from staging: `UNVERIFIED`
- Secret/configuration boundary evidence: `UNVERIFIED`
- Isolation reviewer: `UNASSIGNED`

Expected verified outcome: staging is non-production, uses an isolated non-production database, has a distinct secret/configuration boundary, and cannot access production customer data.

## Monitoring and alert-routing evidence

- External monitor/provider: `UNSET`
- Health target(s): `UNSET`
- Alert route: `UNSET`
- Accountable recipient role: `UNASSIGNED`
- Test alert timestamp UTC: `UNSET`
- Test alert delivery result: `UNVERIFIED`

Repository health endpoints or read-only operational views alone do not prove external alert delivery.

## Incident/rollback rehearsal evidence

- Scenario: `UNSET`
- Incident commander: `UNASSIGNED`
- Start UTC: `UNSET`
- Detection/decision time: `UNSET`
- Rollback/recovery action: `UNSET`
- Finish UTC: `UNSET`
- Outcome: `UNVERIFIED`
- Corrective actions: `UNSET`

A tabletop or rehearsal must preserve the separation between application rollback and database recovery. It must not modify production data unless separately authorised.

## Verification checklist

- [ ] Named accountable operational roles are assigned and reviewed.
- [ ] Backup/restore exercise has explicit database-owner approval.
- [ ] Safety preflight was run against the exact approved disposable target.
- [ ] Backup artifact size and checksum are recorded.
- [ ] Restore validation passed against predetermined criteria.
- [ ] Achieved RPO/RTO are calculated from recorded timestamps.
- [ ] Staging isolation has reproducible evidence.
- [ ] External monitoring produced a delivered test alert.
- [ ] Incident/rollback rehearsal is timestamped and reviewed.
- [ ] Evidence contains no secrets or customer data.

Until every applicable item is satisfied, T004 remains incomplete.