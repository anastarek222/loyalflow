# T004 Disposable Local Recovery Exercise Evidence — 2026-08-09

## Scope

This record captures sanitized evidence from explicitly authorised disposable-local PostgreSQL backup/restore exercises. It is not production recovery evidence and must not be used to claim production RPO/RTO achievement.

## Execution result

- State: `EXECUTED_UNVERIFIED`
- Date: 2026-08-09
- Operator: Anas Tarek (`anastarek222`)
- Environment: local disposable PostgreSQL 18.4
- Host: `127.0.0.1`
- Port: `5432`
- Result: `PASS`

## Latest repeat verification

The approved exercise was repeated after aligning the PostgreSQL client tools with the already-running PostgreSQL 18.4 local server. The prior PostgreSQL 17 client attempt was rejected by `pg_dump` because the server was 18.4; that failed attempt produced no completed backup/restore result. The successful repeat used PostgreSQL 18.4 client and server versions.

### Database identities

- Source database: `loyalflow_t004_30218eef34_source_test`
- Restore database: `loyalflow_t004_30218eef34_restore_test`

### Backup evidence

- Backup start UTC: `2026-08-09T10:54:34.296Z`
- Backup finish UTC: `2026-08-09T10:54:34.391Z`
- Backup duration: `95 ms`
- Backup artifact size: `1891 bytes`
- SHA-256: `7af650eb586058aaf60bee1f476d34e1f1c1b41f9e44de4fc072c12d8192e4b2`

### Restore evidence

- Restore start UTC: `2026-08-09T10:54:34.527Z`
- Restore finish UTC: `2026-08-09T10:54:34.580Z`
- Restore duration: `53 ms`
- Validation rows: `3`
- Validation markers: `alpha,beta,gamma`
- Result: `PASS`

## Earlier successful execution

A prior successful execution on the same date also passed with synthetic disposable data:

- Source database: `loyalflow_t004_f752d119cd_source_test`
- Restore database: `loyalflow_t004_f752d119cd_restore_test`
- Backup duration: `148 ms`
- Backup artifact size: `1891 bytes`
- SHA-256: `6a3f05b68b0fa169478aa99552a3818c3cd9b6bd88745494c2e6234df09b8191`
- Restore duration: `61 ms`
- Validation rows: `3`
- Validation markers: `alpha,beta,gamma`
- Result: `PASS`

## Safety observations

- The successful exercises used synthetic disposable databases ending in `_test`.
- The exercise script uses local host `127.0.0.1:5432` and refuses a non-local `PGHOST`.
- The exercise did not use LoyalFlow `DATABASE_URL`.
- The exercise did not access production, Preview/Neon, customer data, or remote databases.
- The exercise cleanup path removes the generated disposable databases and dump artifact.
- This record contains no credentials, passwords, tokens, or customer data.

## Recovery objective interpretation

The local synthetic exercises demonstrate that the guarded backup and restore procedure executes successfully under controlled local conditions. The measured `95 ms` backup and `53 ms` restore durations from the latest repeat are procedure timings only. They do not establish an achieved production/service RPO or RTO.

The repository's proposed operational targets remain:

- RPO: 15 minutes — `UNVERIFIED` for production/service operation.
- RTO: 30 minutes — `UNVERIFIED` for production/service operation.

## Remaining review requirement

This evidence remains `EXECUTED_UNVERIFIED` until an Independent Reviewer validates the record. T004 also remains incomplete while external monitoring/alert-routing evidence and unresolved operational owner assignments remain open.
