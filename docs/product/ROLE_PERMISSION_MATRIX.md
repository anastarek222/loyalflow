# Tanee Role / Permission Matrix

Status: `CLOSED — FOCUSED TESTED` at non-WhatsApp closeout head `669910ec81fb158c2e35cfdc7d5dedad1d437f12`. Browser and Staging verification remain separate gates.

The canonical policy is `lib/permissions.ts`. Navigation and buttons may hide unavailable actions, but they never grant authority. Every protected route, action, and API must resolve the authenticated user, resolve the target Business, enforce tenant identity, then check the required capability.

## Capability authority

| Capability     | Super Admin | Owner        | Manager      | Staff        | Viewer       |
| -------------- | ----------- | ------------ | ------------ | ------------ | ------------ |
| Customers view | Global      | Own Business | Own Business | Own Business | Own Business |
| Customers edit | Global      | Own Business | Own Business | No           | No           |
| Loyalty earn   | Global      | Own Business | Own Business | Own Business | No           |
| Loyalty redeem | Global      | Own Business | Own Business | Own Business | No           |
| Loyalty adjust | Global      | Own Business | Own Business | No           | No           |
| Reports view   | Global      | Own Business | Own Business | No           | Own Business |
| Team manage    | Global      | Own Business | No           | No           | No           |
| Settings edit  | Global      | Own Business | No           | No           | No           |

All non-Super-Admin grants above require `user.businessId === targetBusinessId`. Plan and subscription gates remain additive; a role grant never bypasses them.

## Product surface mapping

| Surface                               | Visibility/read authority                                                                          | Mutation authority                                                    | Server enforcement                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Dashboard                             | Assigned active Business; platform shell for Super Admin                                           | Capability-specific actions only                                      | Role-aware entry plus tenant resolution                                               |
| Customers                             | `CUSTOMERS_VIEW`                                                                                   | `CUSTOMERS_EDIT`                                                      | Page/action queries are Business-scoped                                               |
| Customer Profile                      | `CUSTOMERS_VIEW`                                                                                   | Edit: `CUSTOMERS_EDIT`; Earn/Redeem/Adjust use their own capabilities | Each action rechecks its capability and Business                                      |
| Scan                                  | `LOYALTY_EARN`                                                                                     | Earn: `LOYALTY_EARN`; Redeem: `LOYALTY_REDEEM`                        | Scan APIs and actions recheck the target Business and capability                      |
| Rewards                               | `SETTINGS_EDIT`                                                                                    | `SETTINGS_EDIT` plus plan/subscription rules                          | Reward actions use `canManageBusiness` before semantic commands                       |
| Offers                                | `CUSTOMERS_VIEW` for read-only audience visibility                                                 | `SETTINGS_EDIT` plus plan/subscription rules                          | Offer actions use `canManageBusiness`; page derives read-only/manage state separately |
| Reports / Activity                    | `REPORTS_VIEW`                                                                                     | High-risk reversal flows remain Owner/Super-Admin only                | Pages/APIs recheck `REPORTS_VIEW`; reversal authority is separately enforced          |
| Export                                | No generic role shortcut                                                                           | Super Admin, or assigned Owner when export permission is enabled      | `canExportBusinessData` plus Business scope                                           |
| Team                                  | `STAFF_MANAGE`                                                                                     | `STAFF_MANAGE`                                                        | Page and every mutation recheck the capability; target users are tenant-scoped        |
| Settings / Loyalty Program / Branches | `SETTINGS_EDIT`                                                                                    | `SETTINGS_EDIT`                                                       | Routes and actions use `canManageBusiness`                                            |
| Card                                  | Public bearer-token read for the customer card; management follows Settings authority              | Card configuration: `SETTINGS_EDIT`                                   | Public token lookup and authenticated management are separate boundaries              |
| Custom Card                           | Managed configuration view follows Settings authority                                              | Provider/Super-Admin-only artwork upload/publish plus plan gate       | Generic Owner Settings authority does not grant artwork mutation                      |
| Plans / subscription                  | Platform Plans are Super-Admin administration; Business subscription surfaces remain tenant-scoped | Provider/high-risk operations keep their explicit guards              | Role, subscription state, confirmation, and environment gates are additive            |

## Role outcomes

- `OWNER`: full operational and Business configuration authority within the assigned Business; cannot cross tenants.
- `MANAGER`: customer edit, earn, redeem, adjust, and reports; cannot manage Team or Settings.
- `STAFF`: cashier path—customer read, Scan/earn, and redeem; no customer edit, adjust, reports, Team, or Settings.
- `VIEWER`: read-only customer and report visibility; no operational or configuration mutations.
- `SUPER_ADMIN`: global platform authority through the central capability helper, with separate MFA, provider, plan, confirmation, and Custom Card restrictions where required.

## Verification boundary

Focused source and policy tests prove the matrix and direct server guards. Desktop/mobile browser journeys and exact-head Staging verification must be recorded separately before this phase can be labeled `VERIFIED`.
