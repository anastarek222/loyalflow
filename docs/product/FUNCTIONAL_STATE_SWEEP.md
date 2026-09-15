# Functional State Sweep

Status: `CLOSED — SOURCE AND FOCUSED TESTED`. Browser and exact-head Staging verification remain separate gates.

This sweep covers functional behavior only. Stitch owns final visual presentation.

| Surface     | Empty / loading                                               | Success / failure                         | Permission / subscription                                             | Stale / conflict / not found                                                                                                |
| ----------- | ------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Customers   | List/detail loading and empty states                          | Action feedback on list/profile           | Capability and subscription feedback                                  | Tenant-scoped missing customer and safe duplicate recovery                                                                  |
| Rewards     | Route loading and empty catalog                               | Create/update/status feedback             | Settings, plan, limit, and subscription feedback                      | Missing target and live-entitlement conflict feedback                                                                       |
| Offers      | Route loading and empty catalog                               | Create/update/status feedback             | Read-only vs manage, plan, limit, audience, and subscription feedback | Missing target and invalid audience feedback                                                                                |
| Reports     | Route loading and bounded empty results                       | Filter/export outcomes                    | Reporting and export authorities                                      | Invalid filters fail safely                                                                                                 |
| Scan        | Shared route loading, camera/search recovery, no-result state | Explicit earn/redeem success              | Permission and subscription feedback                                  | Invalid input, unavailable reward, insufficient balance, replay conflict, invalid branch/staff, generic unconfirmed failure |
| Card        | Request-fresh rendering and empty offers/rewards              | Live data rendered from canonical truth   | Public bearer-token boundary                                          | Explicit unavailable/invalid-link page                                                                                      |
| Custom Card | Existing draft/published/version states                       | Upload/publish result receipts            | Plan, subscription, provider, and Super-Admin gates                   | Missing, corrupt, oversized, storage unavailable, and version pagination contracts                                          |
| Team        | Route loading and empty team state                            | Create/status/password/access feedback    | Owner/Super-Admin and subscription feedback                           | Missing account, protected Owner, self-status, duplicate email, and plan-limit feedback                                     |
| Settings    | Route loading and section receipts                            | Profile/program/card/export/sync outcomes | Settings, subscription, provider, and Super-Admin gates               | Provider/runtime unavailable states stay explicit                                                                           |

## Corrected gap

Scan-origin earn and redeem now preflight the effective persisted subscription lifecycle and show `subscription-restricted` in Arabic and English. The previous fallback could describe a blocked redemption as insufficient balance or a blocked earn as a generic failure. The transaction-level subscription check remains authoritative, so this UX correction does not weaken server enforcement.

## Verification boundary

Source and focused tests establish that every listed surface has a bounded outcome and that the corrected Scan message matches the actual reason. Desktop/mobile interaction and runtime-provider behavior must still be proven in their later UAT and external-certification phases.
