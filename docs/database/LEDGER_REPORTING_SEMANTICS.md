# Ledger Reporting Semantics

Status: reporting foundation
Scope: pure derivation only
Production database mutation: forbidden

## Purpose

This document defines the first reporting layer for the append-only loyalty ledger after earn refunds, earn voids, and redemption reversals were introduced.

The reporting contract must preserve historical truth. Persisted lifetime counters remain gross history; net values are derived from ledger rows.

## Canonical V1 metrics

### Earn

- `grossEarned`: positive committed `EARN` loyalty amounts.
- `earnRefunded`: absolute value of valid negative `REVERSAL` rows with `EARN_REFUND`.
- `earnVoided`: absolute value of valid negative `REVERSAL` rows with `EARN_VOID`.
- `earnReversed`: `earnRefunded + earnVoided`.
- `netEarned`: `grossEarned - earnReversed`.

### Redemption

- `grossRedeemed`: absolute value of committed negative `REDEEM` loyalty amounts.
- `redemptionReversed`: valid positive `REVERSAL` rows with `REDEMPTION_REVERSAL`.
- `netRedeemed`: `grossRedeemed - redemptionReversed`.

### Adjustments

Manual adjustments stay separate from refund/reversal reporting.

- `adjustmentAdds`: positive `ADJUSTMENT` amounts.
- `adjustmentSubtracts`: absolute value of negative `ADJUSTMENT` amounts.

A reversal is never reported as an adjustment.

### Recorded sales

When immutable `saleAmount` snapshots exist:

- `grossRecordedSales`: positive sale snapshots attached to `EARN` rows.
- `refundedSales`: positive sale snapshots attached to valid earn refund/void reversal rows.
- `netRecordedSales`: `grossRecordedSales - refundedSales`.

Current business configuration must not reinterpret historical sale snapshots.

## Invalid reversal rows

Reporting must not silently treat a malformed reversal as valid financial movement.

A reversal is considered malformed for this reporting layer when:

- an earn refund/void does not have a negative loyalty amount;
- a redemption reversal does not have a positive loyalty amount;
- a `REVERSAL` row has no recognized reversal kind.

Malformed reversal rows are excluded from the financial derived totals and surfaced through `invalidReversalCount` for operational review.

## Unresolved exceptions

Blocked reversal exceptions are not inferable from the financial ledger because a blocked reversal intentionally creates no financial ledger row.

Therefore the pure reporting helper accepts `unresolvedExceptions` as an explicit external count. It must not fabricate this count from ledger notes, adjustments, or malformed rows.

This PR does not choose or add the durable persistence model for unresolved exceptions. Until that persistence model is implemented and reviewed, user-facing reporting must not claim that the unresolved-exception metric is live database-derived data.

## Non-goals

- no report page changes;
- no export changes;
- no schema or migration changes;
- no unresolved-exception persistence;
- no production database mutation;
- no historical row rewrite.

## Next integration slice

A later narrow PR may query tenant/date/branch/staff-scoped ledger rows and feed them into this pure derivation helper. The unresolved-exception source remains a separate prerequisite for presenting that metric as live operational data.
