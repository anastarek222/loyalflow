# TC6.5 Vercel Queues Beta transport

Status: implemented and locally tested; isolated-Staging runtime verification remains open.

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
