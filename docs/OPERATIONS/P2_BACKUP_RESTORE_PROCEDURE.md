# P2 Backup and Restore Procedure (Disposable Local Test Database Only)

## Purpose

Define a cautious procedure for a future backup/restore exercise against an owner-approved, disposable local PostgreSQL test database. This document does not authorize execution against production, preview, staging, remote, shared, or otherwise non-disposable databases.

No backup or restore has been executed or measured for this slice.

## Safety Preflight

The verification wrapper at `scripts/verify-p2-backup-restore-guard.ts` accepts only `--preflight`. It calls `assertDatabaseScriptEnvironment` with the `backup-restore-documentation` script class and validates environment metadata from `DATABASE_URL` and `LOYALFLOW_ALLOW_DISPOSABLE_DB`.

The preflight requires:

1. `LOYALFLOW_ALLOW_DISPOSABLE_DB` to equal `1`.
2. `DATABASE_URL` to use the `postgresql://` or `postgres://` protocol.
3. The host to be exactly `localhost` or `127.0.0.1`.
4. The path to contain one database name ending in `_test`.
5. The database name to contain no extra path segment or encoded character.
6. The URL to contain no fragment.

The wrapper validates environment metadata only. It does not connect to PostgreSQL, execute `pg_dump` or `psql`, or directly wrap either tool. Passing preflight does not technically prevent an operator from running a separate shell command; it supplies a fail-closed metadata check that must be completed before an owner-approved exercise.

The wrapper reports only the resolved environment, hostname, and database name. Do not print, paste into logs, or place credentials in command output.

Example preflight using a credential-free disposable-local URL:

```bash
LOYALFLOW_ALLOW_DISPOSABLE_DB=1 \
DATABASE_URL="postgresql://localhost:5432/loyalflow_test" \
tsx scripts/verify-p2-backup-restore-guard.ts --preflight
```

## Preconditions for a Future Exercise

- Obtain explicit approval from the database owner for the named disposable local test database.
- Confirm that destroying or replacing all data in the target is acceptable.
- Keep credentials outside documentation, terminal history, and captured logs by using an approved local secret mechanism.
- Run the wrapper with `--preflight` immediately before any separately operated backup or restore step.
- Choose an approved backup destination outside the database's failure domain. A backup stored only on the same local machine is temporary exercise material, not reliable independent backup storage.
- Record the approved target, operator, timestamps, artifact checksum, validation criteria, and cleanup plan without recording credentials.

## Backup Exercise (Conceptual)

After owner approval and a successful preflight, an authorized operator may separately use the organization-approved PostgreSQL logical-backup procedure. The exact `pg_dump` invocation, credential transport, output location, encryption, retention, and integrity checks must be reviewed for the exercise environment before execution; this wrapper neither constructs nor runs that command.

Record the start and finish times, PostgreSQL tool version, sanitized target identity, artifact size, checksum, and outcome. Treat a locally stored artifact as disposable test evidence only, not as durable or independent backup storage.

## Restore Exercise (Conceptual)

Restore only into a separately approved disposable local test target. Run the wrapper with `--preflight` against that target immediately before the exercise. An authorized operator must prepare the target and run the approved `psql` or PostgreSQL restore procedure separately; do not derive database names by parsing connection URLs in shell commands.

Define validation queries and expected results before starting, but run them only as part of the owner-approved database exercise. Record restore timing, integrity checks, validation results, and any failure without including credentials.

## Stop Conditions

Stop without running any database tool if:

- preflight fails;
- approval or target ownership is unclear;
- the host is remote or the database is not disposable;
- the target identity differs from the approved record;
- credential handling, backup destination, validation, or cleanup has not been approved.

## Evidence Gap

G02 remains open. No measured disposable-database backup/restore evidence, achieved RPO, achieved RTO, or independently stored recovery artifact exists yet.

## References

- `lib/server/database-script-guard.ts` — environment-metadata guard.
- `tests/backup-restore-guard.test.ts` — isolated guard tests with no database connection.
- `scripts/verify-p2-backup-restore-guard.ts` — metadata-only `--preflight` wrapper.
- `docs/OPERATIONS/P2_RPO_RTO_RUNBOOK.md` — proposed recovery objectives and future measurement record.
