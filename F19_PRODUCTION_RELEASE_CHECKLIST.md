# LoyalFlow Production Release Checklist

Use this checklist for the exact Git commit intended for release.

## 1. Code checkpoint

```bash
git status
git rev-parse HEAD
pnpm run verify:release-checkpoint
pnpm run release:final
```

Before production approval, include the final browser gate:

```bash
export UAT_FIXTURE_PASSWORD='<existing disposable UAT password>'
pnpm run release:final:browser
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

Then run the read-only operational snapshot:

```bash
pnpm run verify:operations
```

Then verify authentication and one disposable tenant workflow.

## 7. Monitoring authority

Use `F19_MONITORING_ALERTING_POLICY.md` as the monitoring source of truth for
the release. Before Pilot/Production monitoring is certified, confirm that the
canonical Production URL is the monitored target and that **external alert
delivery** has an Owner-approved provider/destination with a controlled test
alert receipt.

A release is not operationally certified while a Critical or unresolved High
monitoring condition is active. Do not commit alert-provider credentials or
notification secrets to the repository.

## 8. Rollback trigger

Rollback the application deployment immediately if any of these fail:

- authentication
- tenant isolation
- readiness
- loyalty write correctness
- Scan idempotency
- public card privacy

Do not rewrite or delete applied migration history as an application rollback.


## Incident references

- `F19_INCIDENT_RESPONSE_RUNBOOK.md`
- `F19_BACKUP_RECOVERY_CHECKLIST.md`
- `F19_MONITORING_ALERTING_POLICY.md`

Use application rollback for release regressions. Database recovery is a
separate, explicitly verified operation.


## Final approval record

Use `F19_RELEASE_APPROVAL_TEMPLATE.md` to record the exact Git SHA and gate
results. Never include secret values in the approval record.
