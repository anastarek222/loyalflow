# Redemption, Refund, and Reversal Policies v1

Status: Draft for approval
Refund/reversal implementation: Not present yet
Detailed refund/reversal semantics: [`REFUND_REVERSAL_SPEC.md`](./REFUND_REVERSAL_SPEC.md)

## Redemption

Validate tenant, customer, reward, unlock, actor, branch, and staff context; lock balance; reject insufficient balance; store negative REDEEM amount and resulting balance; create one RewardRedemption; consume unlock once; make identical retries idempotent.

## Before commit

Any failure aborts the database transaction and writes no balance, ledger, reward, unlock, promotion, notification, or audit side effects.

## After commit

Committed rows are immutable. A correction creates a new compensating transaction linked to the original, with structured reason, authorized actor, idempotency, and full audit.

## Sales refund target

Support full and partial refunds, maximum refundable amount, repeated-refund protection, original-sale link, reason, operator attribution, balance impact, and reporting impact.

Target behavior:
1. Calculate loyalty attributable to the refunded sale amount using the original operation semantics, never the current programme settings.
2. Create a linked reversal entry.
3. Subtract only the reversible loyalty amount that has not already been reversed.
4. Never delete or rewrite the original earn.
5. Never create a negative balance.
6. Never allow cumulative commercial refunds to exceed the original refundable sale amount.
7. Never allow cumulative loyalty reversals to exceed the original credited loyalty amount.

V1 negative-balance policy: block automatic completion and require authorized manual resolution. Do not create loyalty debt yet and do not silently apply a partial automatic reversal.

## Earn already spent

When refunded credit has already funded a redemption:
- preserve earn and redemption history;
- block the automatic reversal when it would violate the negative-balance policy;
- flag an unresolved exception for review;
- require explicit resolution reason;
- expose it in audit and reports;
- never delete the redemption.

## Redemption reversal target

Allowed only when fulfillment was cancelled, the exact original redemption and ledger operation are referenced, it was not already reversed, unlock restoration is explicit, and the operation is authorized, idempotent, and fully audited.

Target metric semantics: persisted lifetime totals remain gross historical totals; net earned/redeemed and reversal values are derived for reporting. Changing stored lifetime metric semantics requires a separate migration decision.

## Permissions

- STAFF: normal earn and approved redemption only; no refund/reversal authority by default.
- MANAGER: no unrestricted refund/reversal authority by default.
- OWNER: high-risk refund/reversal requires explicit confirmation and mandatory reason.
- SUPER_ADMIN: recovery authority with mandatory reason and full audit.

## Reporting

Distinguish gross earned, earn reversals, net earned, gross redeemed, redemption reversals, net redeemed, adjustment adds/subtracts, refunded sales, and unresolved exceptions. ADJUSTMENT must never be presented as equivalent to refund or reversal.

## Runtime implementation gate

Do not implement runtime refund/reversal writes until the linked-operation representation, uniqueness/idempotency policy, disposable-PostgreSQL concurrency tests, negative-balance exception path, and reporting semantics in `REFUND_REVERSAL_SPEC.md` are approved.
