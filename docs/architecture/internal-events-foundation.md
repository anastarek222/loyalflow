# Internal events and webhook foundation

## Phase X decision

Phase X adds a pure, in-process event-envelope contract only. Existing
`BusinessActivity` records remain the audit trail and no webhook, event table,
queue, background worker, HTTP request, provider call, or customer message is
created.

## Event contract

`lib/events/foundation.ts` defines a small set of tenant-scoped event types:

- `LOYALTY_BALANCE_CHANGED`
- `REWARD_STATE_CHANGED`
- `CUSTOMER_MEMBERSHIP_CHANGED`
- `BUSINESS_PRESENTATION_CHANGED`

Each future event requires a business ID, optional customer ID, source record
ID, timestamp, and non-PII operational payload. Its idempotency key is
deterministic from type, tenant, membership (when applicable), and source ID.
Consumers must match the event tenant exactly.

## Future durable outbox

When an approved consuming feature needs reliability (for example Google Wallet
pass refresh), add an additive `InternalEvent`/outbox table in the same database
transaction as its source write. Enforce unique idempotency keys, retain
delivery status separately, and process after commit. A failed delivery must
never roll back an existing loyalty transaction.

## Webhook boundary

Outbound webhooks require a separately approved endpoint registration,
signature scheme, retry/backoff, allowlist/SSRF protection, secret storage,
tenant opt-in, observability, and dead-letter policy. None exists in Phase X.
The only current decision is `NOOP_DISABLED`.
