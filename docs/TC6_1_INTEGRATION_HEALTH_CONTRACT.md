# TC6.1 Provider-neutral integration health contract

Status: implemented on `agent/tc6-integration-health-contract`; merge and
runtime evidence are not claimed.

## Scope and current-state mapping

TC6.1 establishes a pure health-classification and aggregation boundary for
integration executions. The current Google Sheets persistence already records
`PENDING`, `SUCCEEDED`, and `FAILED`, plus a boolean retryable flag. The adapter
maps those existing values without changing the Prisma model, migration history,
sync implementation, scheduler, or provider calls:

| Current state | Health status | Failure classification |
|---|---|---|
| `PENDING` | `PENDING` | `NONE` |
| `SUCCEEDED` | `SUCCEEDED` | `NONE` |
| `FAILED` + retryable | `FAILED` | `RETRYABLE` |
| `FAILED` + non-retryable | `FAILED` | `TERMINAL` |

Unknown states, malformed retryability values, invalid timestamps, future
pending timestamps, and inconsistent status/classification combinations fail
closed. They contribute only to the aggregate rejected count and are never
coerced into a valid health class.

## Contract

The transport-neutral contract exposes only aggregate counts:

- total, classified, and rejected execution counts;
- counts for each execution status;
- retryable and terminal failure counts;
- `fresh`, `delayed`, and `stale` pending counts.

The aggregation clock is an explicit epoch-millisecond input. Pending aging
thresholds are also required inputs and must satisfy
`0 < delayedAfterMs < staleAfterMs`. No default durations are defined because
the product/operations plan has not approved numerical boundaries. Exact
threshold crossings enter the next bucket: delayed at `delayedAfterMs` and
stale at `staleAfterMs`.

The observation and aggregate shapes contain no business, customer, or user
identity; names; diagnostic text; request bodies; secrets; provider responses;
or exception details. The pure implementation performs no network, database,
environment, framework, or provider operation.

## Ownership and compatibility

- `@loyalflow/contracts/integrations/health` owns the transport-neutral enums
  and DTOs.
- `@loyalflow/domain/integrations/health` owns validation, the current-state
  compatibility adapter, deterministic aging, and aggregation.
- Existing Google Sheets code remains the runtime authority and is unchanged.
- A future runtime caller must choose an approved source for `pendingSinceMs`;
  this slice deliberately does not reinterpret `lastAttemptAt` or another field.

## Evidence and deferred work

Automated evidence covers every status and failure classification, mixed
aggregation, exact aging boundaries, unknown/inconsistent input rejection,
invalid clock/threshold rejection, package purity, and forbidden sensitive
fields.

Deferred and not implemented:

- numerical aging durations;
- severity, SLOs, alert thresholds, and incident state;
- runtime reads, dashboards, endpoints, and telemetry;
- durable jobs, queues, retries, idempotency execution, and dead-letter policy;
- provider activation or provider-specific health semantics;
- schema, migrations, database writes, credentials, and Production work.
