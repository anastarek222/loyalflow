# LoyalFlow F19.6 — Final Production Release Gate

This document defines the final release approval sequence. It does not deploy
the application or mutate the production database by itself.

## Release checkpoint

The final release must be a committed, reproducible Git checkpoint.

Run:

```bash
pnpm run verify:release-checkpoint
```

It blocks the release when:

- the Git working tree is dirty
- the current Git SHA is invalid
- runtime `.env` files are tracked
- `.env.example` is missing
- the reviewed Prisma migration history is not exactly 34 migrations
- the latest reviewed migration is not
  `20260726224500_add_subscription_plan_entitlements`
- `pnpm-lock.yaml` is missing

No secrets are printed.

## Final local release gate

After committing the release candidate:

```bash
pnpm run release:final
```

This performs:

1. release checkpoint verification
2. Prisma schema validation
3. Prisma migration status
4. TypeScript
5. lint
6. all Node tests
7. production build

It is read-only with respect to database schema changes.

## Final browser gate

Before production approval:

```bash
export UAT_FIXTURE_PASSWORD='<existing disposable UAT password>'
pnpm run release:final:browser
```

This repeats the final local gate and then runs the authoritative Playwright
browser UAT.

Browser fixtures must use disposable/test data only. Do not point browser UAT
at production customer data.

## Production pre-deploy gate

Load the approved production environment and run:

```bash
pnpm run release:production-preflight
```

This verifies:

- production environment contract
- database connectivity/TLS
- exact production database identity
- Prisma migration status

It does not deploy migrations.

Immediately before an approved production migration:

```bash
pnpm run verify:production-db
```

Only then may the reviewed command be run:

```bash
pnpm run db:migrate:deploy
```

## Post-deploy gate

After the exact tested Git SHA is deployed:

```bash
pnpm run verify:production-smoke
pnpm run verify:operations
```

Then verify the disposable authenticated workflow described in the production
release checklist.

## Read-only combined production verification

When the deployment already exists and production environment values are
loaded, this convenience command runs the production checks that do not mutate
the database:

```bash
pnpm run release:final:production-readonly
```

It includes production preflight, public health smoke checks, and the aggregate
operational snapshot.

## Release manifest

Print a secret-free release manifest:

```bash
pnpm run release:manifest
```

The output contains only:

- service name
- Git SHA
- branch
- safe environment/release metadata
- migration count
- latest migration
- generation timestamp

It does not contain credentials, database URLs, customer data, or tokens.

## Approval rule

Do not approve production when any final gate is failing.

A deployment is considered verified only when:

- the exact committed release candidate passed the final local gate
- browser UAT passed
- production preflight passed
- the exact production database target was verified
- reviewed migrations were applied successfully when required
- public liveness and readiness passed
- operational snapshot was not critical
- one disposable authenticated workflow passed
- tenant isolation and public-card privacy remained intact

## Rollback rule

Application rollback and database recovery are separate operations.

For a release regression, roll back the application first. Never rewrite
Prisma migration history to imitate an application rollback.

See:

- `F19_INCIDENT_RESPONSE_RUNBOOK.md`
- `F19_BACKUP_RECOVERY_CHECKLIST.md`
