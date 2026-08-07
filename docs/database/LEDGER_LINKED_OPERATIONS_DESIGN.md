# Linked Ledger Operations Foundation

Status: Proposed implementation design
Phase: Critical ledger integrity
Runtime changes in this document: None
Production database mutation: Forbidden

## Why this exists

The approved loyalty rules require refunds, voids, corrections, and redemption reversals to be append-only compensating operations. The current ledger has `EARN`, `REDEEM`, and `ADJUSTMENT`, and `RewardRedemption.transactionId` already links a redemption record to its ledger transaction. What is missing is a first-class, tenant-safe link from a compensating ledger row back to the original committed ledger row.

This design defines the minimum additive foundation before runtime refund/reversal commands are implemented.

## Current verified constraints

- `LoyaltyTransaction` is tenant scoped by `businessId` and has `@@unique([id, businessId])`.
- `LoyaltyTransaction.idempotencyKey` is unique per business when present.
- Customer balance writes already lock the customer row before critical mutation.
- `RewardRedemption.transactionId` is an optional one-to-one link to `LoyaltyTransaction` and is tenant-composite.
- Current transaction types are used for earn, redeem, and manual adjustment; adjustment must not be reused to disguise a refund/reversal.
- Existing committed ledger rows are historical evidence and must not be edited or deleted to correct an operation.

## Target V1 representation

Add a distinct compensating transaction type and a tenant-safe self-reference.

Conceptual fields on `LoyaltyTransaction`:

```text
reversalOfTransactionId  String?
reversalKind             ReversalKind?
reversalReason           String?
```

Conceptual transaction type addition:

```text
REVERSAL
```

Conceptual reversal kinds:

```text
EARN_REFUND
EARN_VOID
REDEMPTION_REVERSAL
```

The exact Prisma names are implementation details, but the persisted representation must remain typed rather than using unvalidated JSON for financial semantics.

## Required relation invariant

A reversal can reference only a transaction in the same business.

Target composite relationship:

```text
(reversalOfTransactionId, businessId)
    -> LoyaltyTransaction(id, businessId)
```

The original row may have multiple reversal rows because partial refunds can occur more than once. A reversal row references exactly one original row.

## Allowed relationships

### EARN refund / void

Original:

```text
EARN +1000
```

Compensation:

```text
REVERSAL -400
reversalKind = EARN_REFUND
reversalOf = original EARN
```

A later partial refund may add another `REVERSAL -200` linked to the same original EARN, provided cumulative reversible amount does not exceed the original eligible amount.

### Redemption reversal

Original:

```text
REDEEM -500
```

Compensation:

```text
REVERSAL +500
reversalKind = REDEMPTION_REVERSAL
reversalOf = original REDEEM
```

The normal V1 rule is one completed redemption reversal per original redemption unless a future product rule explicitly supports partial redemption reversal.

## Forbidden relationships

- A reversal cannot reference another business.
- A reversal cannot reference itself.
- A reversal cannot reverse another `REVERSAL` in V1.
- An earn refund cannot reference a `REDEEM`.
- A redemption reversal cannot reference an `EARN`.
- `ADJUSTMENT` cannot stand in for a refund/reversal.
- Historical rows are never rewritten to make a reversal appear as if the original operation never happened.

## Amount semantics

### Earn refund / void

- Reversal ledger `amount` is negative.
- Absolute reversal amount is the approved reversible loyalty credit.
- `saleAmount`, when used for a SALES_AMOUNT refund, represents the refunded sale portion according to the final contract and must be validated against the original sale snapshot.
- The reversal copies the original `sourceLoyaltyMode`; current business settings are not used to reinterpret history.

### Redemption reversal

- Reversal ledger `amount` is positive.
- Amount equals the original redeemed loyalty cost in V1.
- The original `RewardRedemption` row is preserved.

## Cumulative protection

For an original earn:

```text
sum(abs(completed EARN_REFUND/EARN_VOID reversals)) <= original reversible loyalty amount
```

For SALES_AMOUNT, the refunded sale portion must also not exceed the original refundable sale amount.

These checks must be calculated inside the same database transaction after locking the relevant customer/original-operation state. Read-then-write outside a transaction is insufficient.

## Negative-balance exception

An earn refund/void must not automatically create negative customer loyalty balance.

If the customer has already spent the credit and the required reversal cannot be applied safely:

- no financial ledger write is committed for the blocked reversal;
- create/return a structured unresolved-exception result in the future runtime implementation;
- require authorized manual resolution with a reason;
- preserve all original earn/redemption history;
- do not create loyalty debt in V1.

The exact persistence model for unresolved exceptions must be approved before runtime implementation. Do not hide the exception in `note` text only.

## Gross lifetime metrics

For V1:

- `lifetimeEarned` remains gross successful historical earn.
- `lifetimeRedeemed` remains gross successful historical redemption.
- Reversals do not decrement those persisted lifetime counters.
- Net earned/redeemed values are reporting-derived from the ledger.

This avoids rewriting historical counters and keeps gross history auditable.

## Idempotency

Every reversal runtime command must require an operation key.

Same business + same key + same immutable intent:

```text
return prior completed result
```

Same business + same key + different intent:

```text
FinancialOperationConflictError
```

Immutable reversal intent includes at minimum:

- business ID;
- customer ID;
- original transaction ID;
- reversal kind;
- loyalty amount;
- refunded sale amount when applicable;
- reason category/value as defined by the final contract;
- unlock-restoration intent for redemption reversal.

## Authorization

- STAFF: no arbitrary refund/reversal authority.
- MANAGER: no unrestricted reversal by default.
- OWNER: high-risk reversal only with explicit confirmation and mandatory reason.
- SUPER_ADMIN: recovery authority with mandatory reason and full audit.

Server authorization remains authoritative; UI visibility is not authorization.

## Audit requirements

A successful reversal audit record must include safe structured metadata for:

- original transaction ID;
- compensating transaction ID;
- reversal kind;
- amount;
- refunded sale amount where relevant;
- actor;
- branch/staff attribution where applicable;
- mandatory reason;
- idempotency outcome;
- customer/business scope;
- unlock restoration decision where relevant.

Do not store secrets, tokens, or raw sensitive request data in audit metadata.

## Reporting requirements

Reporting must distinguish:

- gross earned;
- earn refunds/voids;
- net earned;
- gross redeemed;
- redemption reversals;
- net redeemed;
- adjustment adds/subtracts;
- unresolved exceptions.

A reversal must never be aggregated as an ordinary `ADJUSTMENT`.

## Migration strategy

The first database change must be additive and forward-only.

1. Add the new typed reversal transaction value/kind.
2. Add nullable link/reason fields.
3. Add the tenant-composite self relation and supporting index/constraint.
4. Apply to disposable PostgreSQL.
5. Run migration-integrity checks and Prisma generation.
6. Run existing full suite before any runtime writer uses the fields.
7. Deploy compatible schema first.
8. Add runtime reversal commands in a later PR.

No historical data backfill is required for the initial additive foundation because no refund/reversal implementation exists today.

## Required database tests before runtime rollout

- cross-tenant original transaction link is rejected;
- valid same-tenant link succeeds;
- multiple partial earn reversals can link to one original transaction;
- reversal-of-reversal is rejected by domain/runtime validation;
- cumulative partial refund race cannot exceed original amount;
- same idempotency key concurrency creates at most one compensating transaction;
- blocked negative-balance refund leaves no ledger/customer/audit side effects;
- rollback after a later failure removes all compensating side effects;
- redemption reversal cannot target the wrong transaction type/customer/business.

## PR sequence

### PR A — schema foundation

Add only the additive typed fields/relation/indexes and migration tests. No user-facing refund/reversal action.

### PR B — earn refund/void command

Implement server-authoritative full/partial earn reversal with concurrency, idempotency, audit, and unresolved-exception behavior.

### PR C — redemption reversal command

Implement high-risk redemption reversal and explicit unlock restoration policy.

### PR D — reports and operator UI

Expose gross/net/refund/reversal reporting and the authorized review/operation UI.

## Stop conditions

Stop implementation immediately if:

- the migration target cannot be proven non-production;
- the self relation cannot enforce tenant ownership;
- an implementation requires editing a historical migration;
- concurrency behavior cannot be proven on real PostgreSQL;
- lifetime metric or unlock-restoration semantics become ambiguous;
- the implementation would silently create negative balance/debt.
