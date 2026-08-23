# TC6.2 Deterministic retry decision contract

Status: implemented on `agent/tc6-retry-decision-contract`; merge and runtime
evidence are not claimed.

## Audit outcome

The preferred privacy-safe runtime read adapter is not executable within the
approved boundary. Reading the existing Google Sheets state would introduce a
new database read, while pending aging also requires an approved source for
`pendingSinceMs`. Neither is inferred in this slice.

The next bounded pure slice is a deterministic retry-eligibility decision that
uses only the TC6.1 failure classification:

| Failure classification | Decision |
|---|---|
| `RETRYABLE` | `RETRY_ELIGIBLE` |
| `TERMINAL` | `DO_NOT_RETRY` |
| `NONE` | `NOT_APPLICABLE` |

Unknown or malformed classifications return no decision and fail closed. The
decision is provider-neutral and contains no identity, diagnostic text,
payload, provider response, token, credential, or other runtime data.

## Explicit boundary

`RETRY_ELIGIBLE` means only that a future approved executor may consider the
failure for retry. It does not schedule or perform work and does not define:

- attempt counts or maximum attempts;
- delay, backoff, jitter, or time windows;
- queue, worker, durable job, or dead-letter behavior;
- provider-specific retry semantics;
- severity, SLO, alert, or incident policy.

The implementation is a pure contract and domain function. It performs no
network call, database read/write, Prisma operation, provider activation,
environment access, schema change, migration, or Production action.

## Evidence and next gate

Focused tests cover the three exact decisions, unknown/malformed fail-closed
behavior, purity, and the absence of hidden execution thresholds. Runtime retry
work remains blocked until durable execution policy, idempotency ownership,
attempt/backoff limits, and provider/operations decisions are approved.
