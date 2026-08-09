# T004 Disposable Local Recovery Exercise Evidence — 2026-08-09

## Scope

This record captures sanitized evidence from the explicitly authorised disposable-local PostgreSQL backup/restore exercise. It is not production recovery evidence and must not be used to claim production RPO/RTO achievement.

## Execution result

- State: `EXECUTED_UNVERIFIED`
- Date: 2026-08-09
- Operator: Anas Tarek (`anastarek222`)
- Environment: local disposable PostgreSQL 18.4
- Host: `127.0.0.1`
- Port: `5432`
- Source database: `loyalflow_t004_f752d119cd_source_test`
- Restore database: `loyalflow_t004_f752d119cd_restore_test`

## Backup evidence

- Backup start UTC: `2026-08-09T09:25:47.533Z`
- Backup finish UTC: `2026-08-09T09:25:47.681Z`
- Backup duration: `148 ms`
- Backup artifact size: `1891 bytes`
- SHA-256: `6a3f05b68b0fa169478aa99552a3818c3cd9b6bd88745494c2e6234df09b8191`

## Restore evidence

- Restore start UTC: `2026-08-09T09:25:47.870Z`
- Restore finish UTC: `2026-08-09T09:25:47.931Z`
- Restore duration: `61 ms`
- Validation rows: `3`
- Validation markers: `alpha,beta,gamma`
- Result: `PASS`

## Safety observations

- The exercise used synthetic disposable databases ending in `_test`.
- The exercise did not use LoyalFlow `DATABASE_URL`.
- The exercise did not access production, staging, customer data, or remote databases.
- The exercise cleanup path removes the generated disposable databases and dump artifact.
- This record contains no credentials, passwords, tokens, or customer data.

## Recovery objective interpretation

The local synthetic exercise demonstrated that the backup and restore procedure can execute successfully under controlled local conditions. It does not establish an achieved production RPO or RTO. The repository's proposed targets remain:

- RPO: 15 minutes — `UNVERIFIED` for production/service operation.
- RTO: 30 minutes — `UNVERIFIED` for production/service operation.

## Remaining review requirement

This evidence remains `EXECUTED_UNVERIFIED` until an Independent Reviewer validates the record. T004 also remains incomplete while staging-isolation evidence, external monitoring/alert-routing evidence, and incident/rollback rehearsal evidence are unresolved.
