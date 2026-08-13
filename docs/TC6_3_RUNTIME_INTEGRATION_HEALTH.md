# TC6.3 Runtime integration-health snapshot

Status: Beta implementation for isolated Staging only.

TC6.3 adds a read-only, provider-neutral runtime snapshot to the existing
Super Admin Operations centre. The reader performs a database-side aggregate
over only `googleSheetsSyncState` and `googleSheetsRetryable`, then exposes
counts for pending, succeeded, retryable failure, and terminal failure.

The slice deliberately excludes business and customer identifiers, error
text, credentials, provider payloads, writes, network calls, retries, workers,
queues, alerts, and Production behavior. Malformed aggregate groups fail
closed and render the snapshot as unavailable.

Pending aging is not inferred from `createdAt`, last-attempt, or any unrelated
timestamp. It remains deferred until the data model has a canonical
pending-start source and Operations approves numerical thresholds. The same
applies to severity, SLOs, alerting, and retry execution.

Verification for the implementation:

- focused contract/runtime tests;
- full test suite;
- TypeScript, lint, workspace boundaries, and production build;
- isolated Staging deployment before accepting the merge.
