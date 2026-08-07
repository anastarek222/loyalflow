# LoyalFlow Refund and Reversal Specification v1

Status: Draft for approval
Implementation status: Not implemented
Scope: Product/domain semantics only
Database and runtime changes: Forbidden in this PR

## Purpose

Define deterministic V1 behavior for refunds, cancellations, voids, earn reversals, and redemption reversals without editing or deleting committed loyalty history.

This specification is intentionally provider-agnostic. It defines loyalty effects only; it does not perform payment-provider or accounting refunds.

## Canonical principles

1. Committed ledger rows are immutable.
2. A correction always creates a new linked compensating operation.
3. Every reversal/refund is tenant scoped, authorized, atomic, audited, concurrency safe, and idempotent.
4. The original transaction remains visible in history and reports.
5. A reversal references the exact original operation it compensates.
6. The total reversed amount can never exceed the reversible amount of the original operation.
7. Repeating the same operation key with identical intent returns the prior result; reusing it with different intent is a conflict.
8. Automatic reversal never creates a negative customer balance.
9. Manual ADJUSTMENT is not a substitute for refund/reversal and must remain reported separately.
10. Historical `sourceLoyaltyMode`, branch, staff, actor, sale amount, reward and promotion context remain immutable on the original rows.

## Terminology

- **Original earn**: committed loyalty credit being compensated.
- **Refunded sale amount**: commercial sale amount approved for refund.
- **Reversible loyalty amount**: loyalty credit attributable to the approved refund and not already reversed.
- **Earn reversal**: new compensating ledger entry that removes reversible earned loyalty.
- **Redemption reversal**: new compensating operation that restores a previously redeemed loyalty cost because fulfillment was cancelled.
- **Unresolved exception**: a refund/reversal request that is commercially valid but cannot complete automatically under V1 safety rules.

## Sales refund semantics

Sales refunds apply to an original SALES_AMOUNT earn that stored the original `saleAmount`.

### Full refund

For an original sale amount `S` and credited loyalty amount `E`:

- approved refunded sale amount is `S`;
- target reversible loyalty is the remaining unreversed portion of `E`;
- the original EARN row is preserved;
- a linked earn-reversal operation subtracts the reversible loyalty from current balance;
- reporting keeps gross earned and refunded/reversed value separate.

### Partial refund

For an approved partial refunded sale amount `R`, where `0 < R <= S`:

- calculate the loyalty attributable to `R` using the original operation semantics, never the current programme settings;
- cap the result by the original earn amount that has not already been reversed;
- cumulative approved sale refunds may never exceed `S`;
- cumulative loyalty reversals may never exceed `E`.

V1 uses whole-number loyalty values only. Any rounding rule required by a future points-per-spend strategy must be defined by that strategy before implementation.

## VISITS and POINTS cancellation semantics

A cancelled operation may reverse an original VISITS or POINTS earn only when the application can identify the exact original earn operation being cancelled.

- Do not infer a historical earn by amount/date alone.
- Use the original earn semantics and original credited amount.
- Preserve the original row and create a linked compensating entry.
- Never use the current `earnAmount` to decide how much historical credit to reverse.

## Maximum reversible amount

For every original earn:

`remainingReversible = originalCreditedAmount - successfullyReversedAmount`

A requested reversal is rejected when:

- the original operation belongs to another tenant/customer;
- the original operation is not eligible for reversal;
- the requested commercial refund exceeds the remaining refundable sale amount;
- the calculated loyalty reversal exceeds `remainingReversible`;
- the same original portion has already been reversed.

## Negative-balance policy

V1 does not create loyalty debt.

If the calculated reversal would make `balance < 0`:

1. do not partially apply the automatic reversal silently;
2. write no financial side effects for the failed automatic attempt;
3. return/record an unresolved exception for authorized review;
4. require an explicit resolution reason before any separate manual action;
5. never delete or rewrite the original earn or redemption.

A future debt model requires a separate approved product and accounting specification.

## Earn already spent

If refundable loyalty was already spent on a reward:

- preserve the original earn;
- preserve every redemption;
- do not delete or mutate a redemption to manufacture enough balance;
- block automatic earn reversal if it would violate the V1 negative-balance policy;
- expose an unresolved exception in audit/reporting;
- require OWNER or SUPER_ADMIN resolution under an explicit reason.

## Redemption reversal

A redemption reversal is allowed only when reward fulfillment was cancelled or invalidated after the redemption committed.

Required conditions:

- exact original RewardRedemption and corresponding REDEEM ledger operation are referenced;
- same tenant and customer are verified;
- original redemption has not already been reversed;
- reason is mandatory;
- actor has high-risk reversal permission;
- operation is idempotent;
- restored amount equals the original redeemed loyalty cost being reversed;
- resulting balance is recorded in a new compensating ledger entry;
- the original redemption remains immutable.

### Reward unlock restoration

Unlock restoration is never implicit.

The reversal intent must state whether an eligible consumed unlock is restored. Restoration is allowed only when the original unlock belongs to the same customer/reward/business and is safe under the reward lifecycle policy. Otherwise loyalty value may be restored while the unlock remains consumed, with the decision captured in audit metadata.

## Lifetime metrics

Target V1 reporting semantics:

- `lifetimeEarned` remains a gross historical credit total and is not decremented by earn reversal.
- `lifetimeRedeemed` remains a gross historical redeemed total and is not decremented by redemption reversal.
- net earned, net redeemed, refunded/reversed amounts, and unresolved exceptions are derived from the ledger/reporting model.

Changing persisted lifetime metric semantics requires a separate migration/compatibility decision.

## Permissions

- STAFF: normal earn and approved redemption only; no refund/reversal authority by default.
- MANAGER: no unrestricted refund/reversal authority by default.
- OWNER: may perform approved high-risk refund/reversal flows with explicit confirmation and mandatory reason.
- SUPER_ADMIN: recovery authority with mandatory reason, full audit, and no tenant-boundary bypass in persisted relations.

Exact capability names are an implementation concern and must reuse the existing authorization model rather than creating UI-only protection.

## Idempotency intent

The immutable intent fingerprint for a reversal/refund must include at minimum:

- business id;
- customer id;
- operation kind;
- original transaction/redemption id;
- requested refund/reversal amount;
- original source loyalty mode;
- reward/unlock identity when applicable.

Reason text may be audited but must not allow a different financial intent to reuse the same operation key.

## Audit requirements

Every successful reversal/refund records:

- stable event type;
- original operation id;
- compensating operation id;
- customer/business identity;
- actor and optional attributed staff;
- branch context when applicable;
- commercial refunded amount when applicable;
- loyalty amount reversed/restored;
- before/after balance;
- reason;
- idempotency/operation identity without exposing secrets;
- unresolved/resolved state when an exception path is used.

## Reporting requirements

Reports must distinguish:

- gross earned;
- earn reversals;
- net earned;
- gross redeemed;
- redemption reversals;
- net redeemed;
- refunded sales;
- manual adjustment adds;
- manual adjustment subtracts;
- unresolved reversal/refund exceptions.

`ADJUSTMENT` must never be relabelled as refund or reversal.

## Required implementation gates

Before runtime implementation:

1. Confirm transaction/operation representation for linked compensating entries.
2. Confirm original-operation linkage and uniqueness strategy.
3. Add disposable-PostgreSQL tests for partial/full/repeated/concurrent reversal.
4. Prove same-key retry and different-intent conflict behavior.
5. Prove cross-tenant original-operation references fail.
6. Prove negative-balance attempts write no financial side effects.
7. Prove reporting separates gross, net, refunds/reversals and adjustments.
8. Rehearse any schema migration on non-production PostgreSQL before production approval.

## Explicitly out of scope

- payment-provider refund execution;
- accounting settlement;
- negative loyalty debt;
- automatic clawback from unrelated future earns;
- editing/deleting historical ledger rows;
- silently reversing rewards because programme settings changed;
- automatic mode conversion.
