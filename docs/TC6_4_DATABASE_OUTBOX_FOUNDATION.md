# TC6.4 database outbox foundation

Status: `STAGING_MIGRATION_VERIFIED`.

## Outcome

This slice adds the approved additive Postgres persistence boundary for future
durable integration execution. It does not activate a worker, queue, provider,
cron schedule, credentials, endpoint, UI, or Production behavior.

The current Google Sheets scheduler remains unchanged. It still runs inside the
web deployment lifecycle and is not claimed to be durable.

## Added boundary

- one business-owned `IntegrationJob` record for each scoped idempotency key;
- `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, and `DEAD` lifecycle states;
- atomic claim through status, readiness time, and expiring lease predicates;
- attempt count and last-attempt time recorded at claim;
- lease-owner checks on completion and failure;
- caller-supplied retry time, with no embedded retry/backoff policy;
- safe bounded machine error codes instead of provider responses or stack text;
- tenant history and ready-job indexes;
- cascade cleanup with the owning business.

Replaying an existing `(businessId, kind, idempotencyKey)` returns the original
record without resetting status, attempts, lease, or completion evidence.

## Isolated Staging evidence

The additive migration was applied only to the isolated Neon `staging` branch
`br-late-leaf-adwhj06g`. Read-only verification on 2026-08-15 confirmed:

- migration `20260814213000_add_integration_outbox_jobs` is finished and was
  not rolled back;
- the recorded checksum exactly matches the committed migration SHA-256
  `2702702e918c8f06475b7738b1dc5d2eb7c4024b7a19fd529aa19ac0a177fd52`;
- migration history is 48/48 successfully applied, with zero incomplete and
  zero rolled-back migrations;
- the expected table, enums, columns, primary key, business foreign key,
  business-scoped idempotency constraint, and ready/history indexes exist and
  are validated;
- `IntegrationJob` is empty, so verification introduced no job or provider
  execution data.

PR #131 records passing focused outbox tests, full application validation,
Migration Integrity, migration-manifest, destructive-SQL, build, and whitespace
checks. The merged Staging commit also has a successful Vercel status.

## Explicitly not included

- no source mutation writes an outbox job yet;
- no Google Sheets adapter consumes a job;
- no Vercel Queue, Workflow, Cron, or other paid/external runtime is added;
- no retry limit, delay, backoff, jitter, aging threshold, SLO, alert, or incident
  policy is selected;
- the migration is applied on isolated Neon Staging only; no worker or provider
  runtime was activated by that application;
- no Production database, variable, deployment, or behavior is touched.

## Next gate

TC6.4 is closed for its bounded persistence-foundation and isolated-Staging
migration gate. TC6 as a whole remains open. A separate approved slice must
choose the execution topology and implement the worker trigger plus the first
transactional Google Sheets enqueue consumer. Retry policy and recovery
rehearsal remain required before claiming durable execution complete.
