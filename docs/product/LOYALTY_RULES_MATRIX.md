# Loyalty Rules Matrix v1

Status: Draft for approval

| Rule | VISITS | POINTS | SALES_AMOUNT |
|---|---|---|---|
| Stored balance | Integer count | Integer count | Integer monetary amount |
| Earn source | `earnAmount` | `earnAmount` | Recorded sale amount |
| Minimum/fractions | Minimum 1; fractions rejected | Same | Same |
| Presentation | Business label | Business label | Currency |
| Source mode stored | Yes | Yes | Yes |
| Sale amount stored | No | No | Yes |
| Negative balance | Forbidden | Forbidden | Forbidden |
| Reward target | Lowest active catalogue cost or fallback threshold | Same | Same |
| Repeated cycles | Supported | Supported | Supported |
| Expiry changes balance | No | No | No |
| Normal mode change after history | Blocked | Blocked | Blocked |

## Validation

- `rewardThreshold` and `earnAmount`: positive integers within approved limits.
- `unitName`: required for VISITS and POINTS.
- `currency`: required before SALES_AMOUNT activation.
- PROMO_CODE reward requires a code.
- Reward cost and expiry days are positive integers.
- Programme activation requires a valid earning path and reward path.

## Change classification

| Change | Empty business | Customers only | Balance or transactions |
|---|---|---|---|
| Rename programme | Allow | Allow | Allow |
| Rename display unit | Allow | Preview | Only when semantic meaning is unchanged |
| Change reward text | Allow | Allow | Allow |
| Change threshold | Allow | Confirm | Confirm + impact preview + detailed audit |
| Change earn amount | Allow | Confirm | Future-only effect + detailed audit |
| Change reward cost | Allow | Confirm | Existing unlock policy required |
| Change mode | Allow | Confirm before first transaction | Block normal save; migration required |
| Change SALES_AMOUNT currency | Allow | Confirm | Block normal save; monetary migration required |

## Current protections to preserve

Row locking, tenant-scoped relations, idempotency conflicts, immutable source mode, stored sale amount, no negative redemption/subtraction, fallback compatibility, and deterministic reward expiry.
