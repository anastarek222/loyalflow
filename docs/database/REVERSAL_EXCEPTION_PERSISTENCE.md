# Durable Reversal Exception Persistence

Status: Proposed V1 persistence contract
Phase: Critical ledger integrity
Production database mutation from this PR: Forbidden

## Purpose

Blocked earn refunds/voids that cannot be applied because the customer no longer has enough loyalty balance are operational exceptions, not ledger transactions. The original earn remains valid historical evidence and no negative loyalty debt is created in V1.

This contract gives those blocked operations a durable, queryable record without rewriting the original transaction or creating a fake `ADJUSTMENT`/`REVERSAL` row.

## V1 scope

Persist only unresolved financial reversal exceptions that require human follow-up. In V1 that means the `INSUFFICIENT_BALANCE` blocker for `EARN_REFUND` and `EARN_VOID`.

Input-validation failures, permission failures, missing originals, already-completed reversals, and unsupported product capabilities are not unresolved financial exceptions and must not create exception rows.

## Data model

A `ReversalException` belongs to one business and one customer and points to the exact original ledger transaction using the tenant-composite `(originalTransactionId, businessId)` relation.

Required immutable attempt evidence:

- business ID;
- customer ID;
- original transaction ID;
- operation ID;
- reversal kind;
- typed block reason;
- attempted loyalty amount;
- attempted sale amount when applicable;
- customer balance observed when the operation was blocked;
- mandatory operator reason;
- actor ID and role;
- optional branch/staff attribution IDs;
- creation timestamp.

Resolution fields are nullable in this foundation. A later guarded resolution command may mark the exception resolved, but this PR does not implement that command.

## Idempotency

`(businessId, operationId)` is unique.

The runtime writer must create-or-return the same exception for a repeated blocked attempt with the same immutable intent. It must never create multiple unresolved records for one idempotent operation.

## Status

V1 statuses:

- `OPEN`
- `RESOLVED`

This foundation does not implement resolution writes. `RESOLVED` exists so the persisted schema is explicit and future resolution does not require overloading free-text metadata.

## Typed block reason

V1 block reason:

- `INSUFFICIENT_BALANCE`

New reasons require an explicit product/operational rule before being added.

## Safety invariants

- Exception persistence is operational evidence only and never changes `Customer.balance`.
- It never changes `lifetimeEarned` or `lifetimeRedeemed`.
- It never creates a `LoyaltyTransaction`.
- It never edits or deletes the original transaction.
- The original transaction relation is same-tenant.
- A cross-tenant customer/original link must be rejected by the database.
- Exception rows are not counted as adjustments or reversals.
- Reports may count `OPEN` exceptions only after the runtime writer is implemented.

## PR sequence

1. Schema + forward-only migration + contract tests.
2. Wire only the guarded earn reversal `INSUFFICIENT_BALANCE` path to persist the exception in the same database transaction boundary used for the blocked attempt.
3. Add read-only operator/report count for open exceptions.
4. Design and implement a separate privileged resolution command.

## Explicitly deferred

- No resolution UI or command.
- No automatic negative-balance debt.
- No production migration execution.
- No backfill.
- No persistence for ordinary validation/authorization errors.
