# Database and Migration Strategy

Neon PostgreSQL remains the initial provider. Future API deployment exclusively owns `DATABASE_URL` and `prisma migrate deploy`; web never migrates. Existing migrations are immutable.

Workflow: design review → additive schema migration → staging migrate/test/backup verification → production deploy/migrate coordination → observability → later contract cleanup. Use forward-only timestamped names. Treat schema migration, data migration, and `pg_dump`/`pg_restore` backup/restore as separate approvals. Destructive changes require expand/contract, owner approval, staged rehearsal, and rollback plan.

Preserve raw SQL protections, especially partial indexes and composite foreign keys. CI runs validate/status/drift inventory against shadow/test DB; no manual production SQL except an incident procedure with backup, peer approval, recorded command, and restore plan. Proposed initial objectives: RPO <= 24h and RTO <= 4h, pending owner confirmation; quarterly restore drills and provider backup/PITR verification are required. PostgreSQL portability is required across providers, not unrelated engines.

## Operational runbooks
1. Create: branch from latest migration history; use Prisma migration generation only against disposable development DB; inspect every generated SQL statement.
2. Review: classify schema/data/destructive work separately; compare SQL with `schema.prisma`; explicitly preserve partial indexes, enum changes, and composite FKs.
3. Test: apply to isolated shadow/test database, run `pnpm db:validate`, `pnpm db:migrate:status`, targeted integration tests, then staging.
4. Deploy: deploy API capable of reading expanded schema first; acquire one deployment/migration lock; API runs `prisma migrate deploy`; web deploy follows and never migrates.
5. Failure: stop concurrent deploys, collect migration/status/log evidence, use forward fix or approved restore; never edit applied migration history.
6. Data migration: versioned/idempotent script with dry-run, batch metrics, backup, staging rehearsal, and post-check; it is not a schema migration.
7. Backup/restore: record `pg_dump` format/version, encrypted storage/retention, `pg_restore --list` verification, isolated restore drill, and documented RPO/RTO result.
8. Provider cutover: logical dump/restore or validated replication, checksum/count/tenant checks, read-only window, DNS/app cutover, rollback endpoint. Owner must approve RPO/RTO, retention, PITR, and emergency SQL access.
