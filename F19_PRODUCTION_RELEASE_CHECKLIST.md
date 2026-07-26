# LoyalFlow Production Release Checklist

Use this checklist for the exact Git commit intended for release.

## 1. Code checkpoint

```bash
git status
git rev-parse HEAD
pnpm run release:check
```

Required:
- working tree clean
- TypeScript PASS
- lint PASS
- tests PASS
- production build PASS

## 2. Load production environment

Required production identity:

```text
NODE_ENV=production
LOYALFLOW_ENVIRONMENT=production
LOYALFLOW_PRODUCTION_DATABASE=<exact current_database() name>
NEXT_PUBLIC_APP_URL=https://...
LOYALFLOW_RELEASE_SHA=<exact Git SHA>
```

Do not print or paste secret values into logs or tickets.

## 3. Read-only production preflight

```bash
pnpm run release:production-preflight
```

This must pass before any production migration command.

## 4. Migration

Re-run the exact target guard immediately before mutation:

```bash
pnpm run verify:production-db
pnpm run db:migrate:deploy
pnpm run db:migrate:status
```

Never use `migrate dev`, `db push`, or `migrate reset` on production.

## 5. Deploy

Deploy the same Git SHA that passed the release gate. Keep the previous
application deployment available for rollback.

## 6. Remote smoke check

```bash
pnpm run verify:production-smoke
```

Then verify authentication and one disposable tenant workflow.

## 7. Rollback trigger

Rollback the application deployment immediately if any of these fail:

- authentication
- tenant isolation
- readiness
- loyalty write correctness
- Scan idempotency
- public card privacy

Do not rewrite or delete applied migration history as an application rollback.
