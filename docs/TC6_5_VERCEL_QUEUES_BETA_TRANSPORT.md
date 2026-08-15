# TC6.5 Vercel Queues Beta transport

Status: `BLOCKED_STAGING_ENV_SCOPE`; implementation remains valid and the first
isolated-Staging runtime rehearsal reached the Queue consumer, but the deployed
`staging` runtime did not receive `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

## Bounded slice

- The Super Admin and pending-Owner business-creation transactions create one
  `GOOGLE_SHEETS_BUSINESS_SYNC` job before commit.
- After commit, the existing non-blocking scheduler publishes only the durable
  job ID through the provider-neutral `IntegrationJobTransport` boundary.
- Vercel Queues is the approved Beta transport and uses a transport-level
  idempotency key derived from the job ID.
- The Vercel-only consumer is configured as an internal `queue/v2beta` trigger.
- The consumer claims the database job lease before provider execution and
  persists success, retryable failure, or terminal failure through the TC6.4
  primitives.

PostgreSQL `IntegrationJob` remains the durability authority. Queue delivery is
at-least-once wake-up transport, not the domain transaction or source of truth.
The message contains no business, customer, user, credential, or provider data.

## Explicit exclusions

- no schema or migration;
- no Production activation or Production credential use;
- no new integration job kind or provider;
- no cutover of customer, loyalty, settings, or other existing sync callers;
- no approved retry/backoff maximum, dead-letter override, SLO, or alert policy;
- no stranded-job scan, dispatcher, or recovery claim;
- no UI, CSS, token, component, route-navigation, or product redesign.

## Verification boundary

Local contract tests and type checking can establish transaction placement,
message minimization, adapter ownership, trigger configuration, and lease-owned
result persistence. TC6.5 is not Staging Verified until a synthetic isolated
Staging business creation proves enqueue, Queue delivery, consumer execution,
duplicate prevention, provider-safe failure handling, and fixture cleanup.

## Isolated-Staging runtime evidence — 2026-08-15

- release `23899e0fb78d` redeployed from the unchanged TC6.5 tree and reached
  `READY` with `environment: staging`;
- one pending-Owner business creation committed one durable job;
- Vercel Queues delivered the wake-up and the consumer claimed the job exactly
  once (`attemptCount=1`), then released the lease through the safe failure path;
- provider execution stopped with `MISSING_SERVICE_ACCOUNT_EMAIL`, proving the
  credential was not present in the deployed branch-scoped Preview runtime;
- cleanup verified zero rehearsal businesses, users, and orphan jobs; no Google
  Sheet mutation occurred and Production was not accessed.

The next action is provider configuration only: scope both Google Service
Account variables to Preview branch `staging`, then redeploy and run one new
bounded rehearsal. Previous local, CI, enqueue, Queue-delivery, lease, safe
failure, and cleanup evidence must not be repeated.
