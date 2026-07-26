# LoyalFlow F19 — Production Deployment Runbook

## Release order

1. Create a dedicated **production** PostgreSQL/Neon database or branch.
2. Configure production environment variables in the hosting platform.
3. Run the preflight checks against production credentials.
4. Review Prisma migration status.
5. Apply committed migrations with `prisma migrate deploy`.
6. Build the exact commit intended for production.
7. Deploy.
8. Verify liveness, readiness, authentication, and one safe business workflow.
9. Keep the previous deployment available for rollback until verification finishes.

## Required production environment

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `LOYALFLOW_ENVIRONMENT=production`
- `LOYALFLOW_PRODUCTION_DATABASE`

`NEXT_PUBLIC_APP_URL` must be the exact HTTPS origin with no trailing slash.

For PostgreSQL providers, use certificate verification when the provider supports it.
The preferred connection option is `sslmode=verify-full`.

## Optional integrations

Google Sheets does not block the core application. Configure its credentials only
when the integration is intentionally enabled.

## Safe database workflow

Before deploying:

```bash
pnpm run db:validate
pnpm run db:migrate:status
```

Immediately before applying migrations, verify the exact production target:

```bash
pnpm run verify:production-db
```

Only after that passes, apply already-reviewed committed migrations:

```bash
pnpm run db:migrate:deploy
```

Never run these against production:

```text
prisma migrate dev
prisma db push
prisma migrate reset
```

## Production preflight

With production environment variables loaded:

```bash
pnpm run release:production-preflight
```

This runs the production environment/readiness verification, exact production
database identity guard, and Prisma migration status without mutating the
database.

This checks:
- required production environment
- HTTPS public origin
- database TLS configuration
- database connectivity
- optional Google Sheets status

It deliberately does not print credentials.

## Full release gate

```bash
pnpm run release:check
```

This performs:
- Prisma schema validation
- migration status
- TypeScript
- lint
- tests
- production build

It does **not** mutate the database.

## After deploy

Check:

```text
GET /api/health/live
GET /api/health
```

Expected:
- `/api/health/live` → HTTP 200
- `/api/health` → HTTP 200 when the database is reachable

Then run the remote health smoke check:

```bash
pnpm run verify:production-smoke
```

Then verify:
- login
- Super Admin access
- one tenant dashboard
- Scan flow on a disposable/test customer
- public enrolment/card flow

## Rollback rule

If authentication, tenant isolation, loyalty writes, or readiness fails after
deployment, roll back the application deployment first. Do not modify migration
history to force a rollback.


## Release identity

Set `LOYALFLOW_RELEASE_SHA` to the Git commit being deployed. Health responses
may expose only the safe shortened release SHA and environment name; they never
expose database URLs, credentials, or secret values.

## Production database identity rule

`LOYALFLOW_PRODUCTION_DATABASE` must exactly match PostgreSQL
`current_database()`. The production guard also rejects database names that
look like test, development, local, or staging environments. This is a
deliberate second confirmation before migration deployment.

## Transport/security headers

Production responses include HSTS in addition to the existing CSP,
frame-ancestor denial, content-type, referrer, permissions, and opener-policy
protections.
