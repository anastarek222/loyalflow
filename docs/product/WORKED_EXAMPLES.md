# Loyalty Worked Examples v1

Status: Draft for approval

## Visits cycle

VISITS, earn 1, threshold 5: five earns create balances 1–5; redemption cost 5 creates balance 0; history contains five EARN rows and one REDEEM row of -5.

## Multiple visits

VISITS, earn 3, threshold 10: balances 3, 6, 9, 12. Progress display caps at 100%, remaining is 0, spendable balance stays 12 until redemption.

## Points catalogue

POINTS label Stars, earn 10, rewards 50 and 100. At balance 70, the 50-cost reward is the default target and affordable; redeeming it leaves 20.

## Sales amount

SALES_AMOUNT, EGP, threshold 2500. Sale 600 credits 600, stores source mode and `saleAmount`, and displays EGP 600. Four sales of 600 plus one sale of 100 reach 2500.

## Idempotent retry

The same operation key and identical intent commits once and returns the prior result on retry. Reusing the key with different customer, amount, mode, sale, reward, promotion, original-operation reference, or reversal amount is a conflict.

## Concurrent redemption

Balance 5, reward cost 5, two terminals redeem simultaneously. Row locking allows only one success; balance never becomes negative.

## Threshold change

Balance 4, threshold 5, proposed threshold 10. Show impact from 80% to 40%, require confirmation, apply prospectively, audit old 5 and new 10, and never rewrite history.

## Unsafe mode change

VISITS balance 5 with historical transactions cannot be changed by normal save to SALES_AMOUNT because five visits cannot safely become EGP 5. A migration workflow is required.

## Full sales refund target

Original SALES_AMOUNT sale/credit 1000 remains unchanged. Current balance is 1400 and none of that earn has been reversed. A full refund of the original 1000 creates a linked reversal for 1000, leaving balance 400. Reports show gross earned 1000 and refund/reversal 1000 separately; the original earn remains visible.

## Partial sales refund target

Original SALES_AMOUNT sale/credit is 1000. A first approved partial refund of 250 reverses 250 loyalty and leaves 750 of the original earn reversible. A later approved refund of 300 reverses another 300. Cumulative commercial refund is 550 and cumulative loyalty reversal is 550. Neither operation uses current programme settings to reinterpret the original earn.

## Repeated refund protection

Original sale/credit is 1000 and 600 has already been successfully refunded/reversed. A new request for 500 is rejected because cumulative refund would exceed the original 1000. No balance, ledger, reward, notification, or audit-success side effect is committed for the rejected financial operation.

## Refunded earn already spent

Original sale/credit is 1000, but current customer balance is only 200 because 800 funded later rewards. A full automatic 1000 reversal would make the balance negative, so V1 blocks automatic completion, preserves the original earn and redemptions, and creates/exposes an unresolved exception for authorized review. It never deletes the redemption and never creates loyalty debt silently.

## Visits cancellation target

VISITS earn 1 was recorded for a specific visit operation. That visit is cancelled and the exact original earn is referenced. A linked reversal removes 1 if current balance permits it. The system does not search for an arbitrary historical `+1` by date or amount and does not use the current `earnAmount` if programme settings changed later.

## Redemption reversal target

A customer redeemed a reward for 50 points and fulfillment was later cancelled. With explicit OWNER/SUPER_ADMIN authority, mandatory reason, exact redemption reference, idempotency, and no prior reversal, a new compensating operation restores 50 points. The original REDEEM and RewardRedemption remain immutable. Unlock restoration is a separate explicit decision recorded in the reversal intent/audit.

## Redemption reversal retry

Two clients retry the same redemption reversal with the same operation key and identical intent. Exactly one compensating operation exists and both callers resolve to the same committed result. Reusing the key for a different redemption or amount is a conflict.

## Cross-tenant reversal rejection

Business A attempts to reverse an earn or redemption belonging to Business B. The original-operation reference fails tenant validation before any financial side effect is written.

## Expired unlock

A 30-day unlock becomes expired at the exact expiry instant, cannot be redeemed, does not silently change balance, and remains in history.
