# T004 Operational Readiness Evidence

Status: **OPEN — evidence collection in progress**

This file is the repository-owned evidence record for T004. It must never be used to imply that a control is achieved before the corresponding evidence is recorded and independently reviewable.

## Safety boundary

This template does not authorize any database connection, backup, restore, provider mutation, production/staging access, secret or environment change, monitoring-service configuration, or deployment.

## 1. Backup and restore drill

Current state: **NOT MEASURED**

Planning targets only:

- Proposed RPO: 15 minutes.
- Proposed RTO: 30 minutes.
- Achieved RPO: unknown until a measured disposable-database exercise is completed.
- Achieved RTO: unknown until a measured disposable-database exercise is completed.

Required sanitized evidence after an explicitly approved drill:

- Exercise date/time and timezone.
- Operator identity.
- Source commit/release SHA.
- Disposable database identity ending in `_test` with no credential or host secret disclosed.
- Backup start/end timestamps.
- Backup artifact size and SHA-256 checksum.
- Statement that the backup artifact was stored in an independent failure domain for the exercise, if applicable.
- Restore start/end timestamps.
- Validation result after restore.
- Measured recovery point.
- Measured recovery duration.
- Final pass/fail against the planning targets.
- Corrective actions for any miss.

Do not record plaintext credentials, connection strings, tokens, customer data, password hashes, or production identifiers here.

## 2. Operational ownership

Current state: **UNASSIGNED**

The following roles must have explicit named owners before T004 closeout. Do not infer or invent a person.

| Operational role | Named owner | Backup/alternate | Evidence/status |
|---|---|---|---|
| Incident commander | UNASSIGNED | UNASSIGNED | Owner decision required |
| Application rollback operator | UNASSIGNED | UNASSIGNED | Owner decision required |
| Database recovery operator | UNASSIGNED | UNASSIGNED | Owner decision required |
| Hosting/provider escalation owner | UNASSIGNED | UNASSIGNED | Owner decision required |
| Monitoring/alert recipient | UNASSIGNED | UNASSIGNED | Owner decision required |

## 3. Staging isolation

Current state: **NOT PROVEN**

Evidence required before closeout:

- Staging environment has a distinct environment identity.
- Staging database identity is distinct from production.
- Staging secrets are isolated from production secrets.
- Staging cannot read or mutate production customer data.
- Release verification records the staging commit/release SHA.
- Any destructive or data-bearing test uses explicitly disposable non-production data only.

Provider screenshots, secret values, database URLs, or customer records must not be committed to this repository. Record only sanitized evidence and references.

## 4. Monitoring and alert routing

Current state: **PARTIAL — repository health/operations checks exist; external alert delivery is not evidenced here**

Evidence required before closeout:

- External uptime/error monitoring or an approved equivalent is configured for the intended environment.
- Alert severity maps to the incident runbook.
- An accountable named recipient is recorded in the ownership matrix.
- A sanitized test alert or equivalent routing verification is recorded with timestamp and outcome.
- No API key, webhook secret, phone number, private email address, or provider credential is committed.

## 5. Incident and rollback rehearsal

Current state: **NOT REHEARSED**

Required evidence:

- Rehearsal/tabletop timestamp.
- Operator/incident commander.
- Source release SHA.
- Scenario exercised.
- Application rollback path checked separately from database recovery.
- Tenant-isolation and loyalty-write incident branches reviewed.
- Outcome and time to decision/recovery, where measured.
- Corrective actions and owners.

## Closeout rule

T004 remains open until all of the following are true:

1. Backup/restore has measured sanitized evidence from an explicitly approved disposable exercise.
2. Achieved RPO/RTO are based on measurements, not planning targets.
3. Operational roles have named owners.
4. Staging isolation has reproducible sanitized proof.
5. Monitoring/alert routing has verified delivery evidence.
6. Incident/rollback rehearsal evidence is recorded.

Until then, the only valid closeout status is **NOT READY FOR DRAFT PR** for T004 completion.