# LoyalFlow Migration Runner Policy

## Purpose

This policy is the operational source of truth for creating, reviewing, testing, and applying LoyalFlow database migrations.

It complements the existing database strategy, environment policy, and production deployment runbooks.

## Core rules

1. Existing committed migrations are immutable.
2. Every database change uses a new forward-only migration.
3. `prisma migrate deploy` is the only migration application command allowed in CI, preview, staging, and production.
4. `prisma migrate dev` is allowed only against disposable local development and shadow databases.
5. `prisma db push` is forbidden for shared or deployed environments.
6. `prisma migrate reset` is forbidden in preview, staging, and production.
7. Normal application startup and web deployment must never apply migrations.
8. Only one approved migration runner may run per environment at a time.
9. Applied migrations must never be edited, renamed, reordered, or deleted.
10. Production execution requires target verification, review, backup ownership, and explicit approval.

## Environment command matrix

| Environment | Generate migration | Apply migrations | Reset |
| --- | --- | --- | --- |
| Disposable local development | `prisma migrate dev` allowed | `prisma migrate deploy` allowed for rehearsal | Allowed only after confirming that the database is disposable |
| Disposable CI PostgreSQL | Forbidden | `pnpm run db:migrate:deploy` | Container disposal replaces reset |
| Preview | Forbidden | Controlled `pnpm run db:migrate:deploy` only | Forbidden |
| Staging | Forbidden | Controlled `pnpm run db:migrate:deploy` only | Forbidden |
| Production | Forbidden | Authorized `pnpm run db:migrate:deploy` only | Forbidden |

## Developer responsibilities

The developer may:

- edit `prisma/schema.prisma`
- generate a migration against isolated disposable databases
- inspect every generated SQL statement
- add targeted tests
- update the immutable migration manifest
- update the destructive SQL baseline only after deliberate review

The developer must not:

- generate migrations against preview, staging, or production
- edit an existing committed migration
- apply migrations to production
- use production data for migration generation or testing
- assume that generated SQL is automatically safe

## Reviewer responsibilities

The reviewer verifies migration intent, append-only ordering, raw SQL correctness, destructive-statement review, tenant isolation, partial indexes, composite foreign keys, tenant-scoped unique indexes, enum compatibility, deployment ordering, and recovery plans.

## Migration runner responsibilities

The migration runner must:

- use the verified target environment and database identity
- run from the exact reviewed release commit
- run `pnpm run db:migrate:status` before deployment
- run `pnpm run db:migrate:deploy` exactly once
- prevent concurrent migration execution
- stop immediately on failure
- retain redacted migration logs

The migration runner must never run:

- `prisma migrate dev`
- `prisma db push`
- `prisma migrate reset`
- unreviewed manual SQL

## Creating a new migration

1. Start from the latest reviewed migration history.
2. Use isolated disposable local and shadow PostgreSQL databases.
3. Edit `prisma/schema.prisma`.
4. Generate a migration with `pnpm exec prisma migrate dev --name <name>`.
5. Review every generated SQL statement.
6. Prefer additive expand-and-contract changes.
7. Add tests for critical database contracts.
8. Add the migration to `prisma/migrations/manifest.json` with its exact order, path, name, and lowercase SHA-256.
9. Update `prisma/migrations/destructive-sql-baseline.json` only after deliberate review.
10. Apply the complete migration history to fresh disposable PostgreSQL before merge.

## Required validation

Run before merge:

```bash
pnpm run validate:migrations
pnpm run validate:destructive-migrations
node --test tests/migration-manifest-validator.test.mjs tests/destructive-migration-scanner.test.mjs tests/migration-raw-sql-contracts.test.mjs
pnpm run db:validate
pnpm run db:generate
pnpm run typecheck
```

GitHub Actions additionally deploys the complete migration history to disposable PostgreSQL and verifies required indexes, constraints, and enum values.

CI must never use Neon, preview, staging, Vercel, or production credentials.

## Production deployment sequence

1. Freeze the reviewed release commit.
2. Confirm application and schema compatibility.
3. Verify the environment and database identity without printing credentials.
4. Confirm migration status.
5. Confirm backup or restore-point ownership.
6. Acquire one migration lock.
7. Run `pnpm run db:migrate:deploy`.
8. Verify migration status and required database objects.
9. Run readiness and safe smoke checks.
10. Record the result before releasing the migration lock.

## Destructive changes

Destructive work includes dropping tables, columns, or constraints; incompatible type changes; required-column changes; data deletion; enum removal; and unsafe index replacement.

Every destructive change requires classification, staged rehearsal, impact analysis, backup ownership, a forward-fix plan, a recovery owner, deliberate baseline review, and post-deployment verification.

The destructive SQL baseline records reviewed statements. It does not make a statement safe by itself.

## Failure handling and rollback

When deployment fails, stop the release and concurrent migration jobs, record the release commit and migration name, collect read-only status and redacted logs, and determine the migration state.

Never edit an applied migration and never run `prisma migrate reset`.

Use a reviewed forward-fix migration, an approved restore, or a reviewed migration-resolution procedure.

Application rollback and database recovery are separate decisions. A previous application version may be restored only when it is compatible with the migrated schema.

## Data migrations

Large or sensitive data changes require a separately reviewed, versioned, idempotent script with dry-run support, tenant scoping, bounded batches, checkpoints, metrics, staged rehearsal, recovery ownership, and post-run verification.

Schema migration approval does not automatically approve a data migration.

## Emergency production SQL

Manual production SQL is forbidden during normal operation.

Emergency SQL requires a confirmed incident, a backup decision, peer approval, exact reviewed SQL, execution ownership, impact analysis, and post-execution verification.

Credentials, database URLs, tokens, and full customer records must never appear in chat, tickets, pull requests, or logs.

## Enforcement files

- `prisma/migrations/manifest.json`
- `scripts/validate-migration-manifest.mjs`
- `prisma/migrations/destructive-sql-baseline.json`
- `scripts/scan-destructive-migrations.mjs`
- `tests/migration-manifest-validator.test.mjs`
- `tests/destructive-migration-scanner.test.mjs`
- `tests/migration-raw-sql-contracts.test.mjs`
- `.github/workflows/migration-integrity.yml`
