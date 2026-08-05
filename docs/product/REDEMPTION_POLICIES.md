# Redemption, Refund, and Reversal Policies v1

Status: Draft for approval
Refund/reversal implementation: Not present yet

## Redemption

Validate tenant, customer, reward, unlock, actor, branch, and staff context; lock balance; reject insufficient balance; store negative REDEEM amount and resulting balance; create one RewardRedemption; consume unlock once; make identical retries idempotent.

## Before commit

Any failure aborts the database transaction and writes no balance, ledger, reward, unlock, promotion, notification, or audit side effects.

## After commit

Committed rows are immutable. A correction creates a new compensating transaction linked to the original, with structured reason, authorized actor, idempotency, and full audit.

## Sales refund target

Support full and partial refunds, maximum refundable amount, repeated-refund protection, original-sale link, reason, operator attribution, balance impact, and reporting impact.

Target behavior:
1. Calculate loyalty attributable to the refunded sale amount.
2. Create a linked reversal entry.
3. Subtract only the reversible loyalty amount.
4. Never delete the original earn.
5. Never create a negative balance.

V1 negative-balance policy: block automatic completion and require authorized manual resolution. Do not create loyalty debt yet.

## Earn already spent

When refunded credit has already funded a redemption:
- preserve earn and redemption history;
- flag an exception for review;
- require explicit resolution reason;
- expose it in audit and reports;
- never delete the redemption.

## Redemption reversal target

Allowed only when fulfillment was cancelled, the original redemption is referenced, it was not already reversed, unlock restoration is explicit, and lifetime metric semantics are approved.

## Permissions

- STAFF: normal earn and approved redemption.
- MANAGER: no unrestricted reversal by default.
- OWNER: reasoned adjustments; high-risk reversal needs stronger confirmation.
- SUPER_ADMIN: recovery authority with mandatory reason and full audit.

## Reporting

Distinguish gross earned, net earned after reversals, redeemed, adjustment adds/subtracts, refunded sales, reversed redemptions, and unresolved exceptions. ADJUSTMENT must never be presented as equivalent to refund or reversal.
