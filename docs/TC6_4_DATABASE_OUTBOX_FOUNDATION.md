# TC6.4 database outbox foundation

Status: `IMPLEMENTED_PENDING_REVIEW_AND_STAGING_MIGRATION`.

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

## Explicitly not included

- no source mutation writes an outbox job yet;
- no Google Sheets adapter consumes a job;
- no Vercel Queue, Workflow, Cron, or other paid/external runtime is added;
- no retry limit, delay, backoff, jitter, aging threshold, SLO, alert, or incident
  policy is selected;
- no migration is applied to Neon Staging by this code change;
- no Production database, variable, deployment, or behavior is touched.

## Next gate

After review and explicit database-execution approval, apply the additive
migration only to isolated Neon Staging and verify schema parity. A separate
approved slice must then choose and implement the worker trigger plus the first
transactional Google Sheets enqueue consumer. Recovery rehearsal is required
before claiming durable execution complete.
