# Cross-Surface Product Scenario Certification

Status: `CLOSED — DETERMINISTIC TESTED`. Runtime browser and Staging verification remain separate gates.

## Reward truth fixture

The shared `getRewardTruth` fixture verifies the same customer state for Public Card, Customer Profile, Scan, server redemption selection, Customers, Reports, and Offers.

Covered states:

- balance below, equal to, and above reward cost;
- fallback-only and catalog-authoritative behavior;
- non-expiring rewards without an unlock row;
- active, expired, redeemed, and unusable expiring unlocks;
- multiple active rewards, all affordable alternatives, deterministic default display, and cheapest progress target;
- prevention of legacy fallback redemption while an active catalog exists.

## Audience truth fixture

The deterministic ten-customer fixture compares Customers, Reports, Export, and Offer eligibility through the shared server audience authority.

Covered traits:

- active and inactive lifecycle;
- VIP and At Risk coexistence;
- Reward Ready;
- High Spender using qualifying net monetary activity;
- Frequent Visitor using qualifying earn-operation frequency;
- refund, void, promotion, stale operation, and loyalty-mode effects;
- tenant-scoped tag audiences.

## Exact focused evidence

At head `d39f448f5514b5aa586b97310561bad2e23cdf1f`, the combined cross-surface suite completed 31 tests with 31 PASS and 0 FAIL:

- `tests/reward-availability.test.ts`
- `tests/customer-audience-cross-surface.test.ts`
- `tests/customer-audience-context.test.ts`
- `tests/customer-audience-reward-unlock-contract.test.ts`
- `tests/public-card-reward-truth-contract.test.ts`
- `tests/offer-eligibility.test.ts`
- `tests/customer-segments.test.ts`

WhatsApp is intentionally excluded and remains governed by its separate lane.
