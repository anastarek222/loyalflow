# LoyalFlow Loyalty Engine Specification v1

Status: Draft for approval
Scope: Product/domain semantics only
Database and runtime changes: Forbidden in this PR

## Supported V1 modes

- VISITS: credits a positive whole-number configured `earnAmount`; labels may be Visit, Stamp, Session, Wash, etc.
- POINTS: credits a positive whole-number configured `earnAmount`; custom labels such as Points or Stars are presentation only.
- SALES_AMOUNT: credits the positive whole-number eligible sale amount; stores both credited amount and `saleAmount`; displays business currency, never `unitName`.

## Canonical ledger rules

1. Loyalty history is append-only.
2. Committed transactions are never edited or deleted to correct an operation.
3. Corrections, refunds, voids, and reversals use new linked ledger entries.
4. Every write is tenant scoped, atomic, audited, concurrency safe, and idempotent.
5. Reusing an idempotency key with different financial intent is a conflict.
6. Redemption and subtraction must never produce a negative balance.
7. Historical rows preserve their original `sourceLoyaltyMode`.

## Balance fields

- `balance`: current spendable loyalty balance.
- `lifetimeEarned`: total successful credited amount; redemption does not reduce it.
- `lifetimeRedeemed`: total successful redeemed cost.
- Accurate analytics should derive from the ledger where required.

## Earn

A successful earn requires a valid active customer, same-tenant business, valid operation context, positive integer amount, valid SALES_AMOUNT sale amount, valid promotion, and valid idempotency.

It persists an EARN row, `balanceAfter`, source mode, optional sale amount, actor/branch/staff attribution, promotion application, and audit activity.

## Redemption

A successful redemption requires an active customer, same-tenant active reward, active unlock when required, sufficient balance, valid operation context, and valid idempotency.

It subtracts cost, increments `lifetimeRedeemed`, stores a negative REDEEM amount and `balanceAfter`, creates RewardRedemption, consumes the unlock once, and writes audit activity.

## Adjustments

Manual adjustments are exceptional:
- ADD or SUBTRACT only;
- positive integer amount;
- mandatory reason;
- authorized actor;
- SUBTRACT cannot create a negative balance;
- always audited;
- never an invisible substitute for refund/reversal.

## Rewards

- Active catalogue rewards replace the fallback only after at least one catalogue reward exists.
- Cheapest active reward is the default progress target.
- All affordable active rewards remain available.
- Expiry begins at unlock time and does not silently change balance.
- Redeemed/expired history is immutable.
- Reward deactivation does not rewrite history.

## Programme change safety

Safe without migration:
- programme name, welcome text, card language, cosmetic presentation;
- labels only when numerical meaning is unchanged.

Requires warning, impact preview, confirmation, and detailed old/new audit:
- reward threshold, earn amount, reward type/cost, expiry policy.

Blocked as a normal settings save after financial history exists:
- changing between VISITS, POINTS, and SALES_AMOUNT;
- changing SALES_AMOUNT currency.

A dedicated migration workflow must include impact report, conversion policy, owner confirmation, high-risk authorization, dry run, immutable audit, rollback/compensation plan, and customer communication decision.

Until implemented, mode changes must be blocked when balances, transactions, rewards, unlocks, or redemptions exist.

## Out of scope for V1

Decimal balances, cashback wallet, hybrid balances, tiers, POS settlement, automatic accounting refunds, and automatic mode conversion.
