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

The same operation key and identical intent commits once and returns the prior result on retry. Reusing the key with different customer, amount, mode, sale, reward, or promotion is a conflict.

## Concurrent redemption

Balance 5, reward cost 5, two terminals redeem simultaneously. Row locking allows only one success; balance never becomes negative.

## Threshold change

Balance 4, threshold 5, proposed threshold 10. Show impact from 80% to 40%, require confirmation, apply prospectively, audit old 5 and new 10, and never rewrite history.

## Unsafe mode change

VISITS balance 5 with historical transactions cannot be changed by normal save to SALES_AMOUNT because five visits cannot safely become EGP 5. A migration workflow is required.

## Full sales refund target

Original sale/credit 1000 remains unchanged. A linked reversal is created for the approved reversible amount. Balance is reduced only without violating the negative-balance policy. Reports show gross credit and refund separately.

## Expired unlock

A 30-day unlock becomes expired at the exact expiry instant, cannot be redeemed, does not silently change balance, and remains in history.
