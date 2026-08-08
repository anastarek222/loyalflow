# P2 RPO/RTO Runbook (Disposable Local Test Database Only)

## Purpose and Scope

Define proposed recovery objectives and the evidence required from a future owner-approved exercise against a disposable local PostgreSQL test database. This runbook must not be used against production, preview, staging, remote, shared, or otherwise non-disposable databases.

No database schedule or automated backup job is established by this runbook.

## Proposed Targets

- **Proposed RPO: 15 minutes.** This is a planning target pending evidence from an approved backup cadence and measured recovery exercise. It is not an achieved or verified RPO.
- **Proposed RTO: 30 minutes.** This is a planning target pending measured detection, preparation, restore, and validation timings. It is not an achieved or verified RTO.

Actual achieved RPO and RTO remain unverified. No backup/restore execution evidence currently supports either target.

## Safety Boundary

Before a future exercise:

1. Obtain explicit database-owner approval for a named disposable local test database.
2. Confirm that complete loss or replacement of the target data is acceptable.
3. Run `scripts/verify-p2-backup-restore-guard.ts --preflight` with the approved local target metadata.
4. Stop if the preflight fails or the target identity differs from the approval record.
5. Keep credentials outside documentation, terminal history, and captured evidence.

The wrapper validates environment metadata only. It does not connect to PostgreSQL or execute or wrap backup and restore commands. An authorized operator must review and run any PostgreSQL tools separately during the approved exercise.

## Future Exercise Outline

1. Record the approved target, operator, planned backup point, and validation criteria.
2. Run the metadata-only wrapper with `--preflight`.
3. Use an owner-approved logical-backup procedure and record sanitized timing and integrity evidence.
4. Store exercise artifacts in an approved location outside the database's failure domain. A local artifact on the same machine is not reliable independent backup storage.
5. Prepare a separately approved disposable local restore target.
6. Run the metadata-only wrapper with `--preflight` for the restore target.
7. Use the approved restore procedure and measure preparation, restore, and validation time.
8. Execute the predetermined validation checks and record sanitized results.
9. Clean up disposable targets and artifacts according to the approved plan.

## Required Evidence

- [ ] Database-owner approval identifies the disposable local test targets.
- [ ] Preflight output records only sanitized environment metadata.
- [ ] Backup start and completion timestamps are recorded.
- [ ] The backup artifact has a recorded size and checksum.
- [ ] Backup storage is demonstrably outside the target database's failure domain.
- [ ] Restore preparation, execution, and validation timings are recorded separately.
- [ ] Predetermined validation checks return expected results.
- [ ] The measured recovery point is calculated from evidence.
- [ ] The measured recovery time is calculated from evidence.
- [ ] Credentials and other secrets are absent from the evidence.

## Stop Conditions

- Stop if any target is remote, shared, non-disposable, or ambiguously identified.
- Stop if preflight, owner approval, credential handling, or artifact-storage requirements are incomplete.
- Stop on backup integrity failure; do not attempt to treat the artifact as recoverable.
- Stop on restore or validation failure and retain only the sanitized evidence required for investigation.
- Never promote a disposable exercise target or artifact to production use.

## Status

The 15-minute RPO and 30-minute RTO are proposed targets only. No cron schedule or other backup cadence is claimed to exist. Actual achieved RPO/RTO and measured disposable-database backup/restore evidence remain missing, so G02 stays open.

## References

- `docs/OPERATIONS/P2_BACKUP_RESTORE_PROCEDURE.md` — conceptual, owner-approved exercise procedure.
- `lib/server/database-script-guard.ts` — environment-metadata guard.
- `tests/backup-restore-guard.test.ts` — isolated guard tests with no database connection.
- `scripts/verify-p2-backup-restore-guard.ts` — metadata-only `--preflight` wrapper.
