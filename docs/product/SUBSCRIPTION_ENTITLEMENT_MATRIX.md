# Subscription / Trial / Entitlement Matrix

Status: `CLOSED — FOCUSED TESTED`. Exact-head Staging and browser verification remain separate gates.

The subscription lifecycle controls what kind of operation may run. The plan controls which product features and capacities are available. Role permission, tenant identity, provider readiness, and environment authorization remain additive gates.

Trial duration is 14 days. The Trial begins at the first successful Launch under the current product contract.

## Lifecycle operations

| State                    | Read | Export | Operate existing data | Expand capacity | Purchase | Data preserved |
| ------------------------ | ---- | ------ | --------------------- | --------------- | -------- | -------------- |
| Pending                  | Yes  | Yes    | No                    | No              | Yes      | Yes            |
| Trialing                 | Yes  | Yes    | Yes                   | Yes             | Yes      | Yes            |
| Active                   | Yes  | Yes    | Yes                   | Yes             | Yes      | Yes            |
| Past Due                 | Yes  | Yes    | Yes                   | No              | No       | Yes            |
| Suspended                | Yes  | Yes    | No                    | No              | No       | Yes            |
| Canceled, current period | Yes  | Yes    | Yes                   | No              | No       | Yes            |
| Expired                  | Yes  | Yes    | No                    | No              | No       | Yes            |

Roles and tenant isolation are preserved in every lifecycle state. Read/export availability does not bypass role-specific export policy.

## Plan features and default capacity

| Plan     | Core | Rewards | Offers | Reporting | Campaigns | Referrals | Multi-branch | Customers |     Users |  Branches | Offers limit | Rewards limit |
| -------- | ---- | ------- | ------ | --------- | --------- | --------- | ------------ | --------: | --------: | --------: | -----------: | ------------: |
| Free     | Yes  | Yes     | Yes    | No        | No        | No        | No           |       100 |         2 |         1 |            1 |             1 |
| Starter  | Yes  | Yes     | Yes    | Yes       | No        | No        | No           |       500 |         5 |         1 |            5 |             5 |
| Pro      | Yes  | Yes     | Yes    | Yes       | Yes       | Yes       | Yes          |     2,500 |        15 |         5 |           25 |            25 |
| Business | Yes  | Yes     | Yes    | Yes       | Yes       | Yes       | Yes          | Unlimited | Unlimited | Unlimited |    Unlimited |     Unlimited |

Configured persisted plan limits may narrow or extend the defaults through the existing plan-configuration authority. Every capacity-creating semantic command must recheck the effective persisted limit inside its transaction.

## Enforcement order

1. Authenticate the user and resolve the target Business.
2. Enforce tenant and role capability.
3. Project any expired Trial to the effective lifecycle state.
4. Check lifecycle intent: read, export, operate, expand, or purchase.
5. Check the plan feature.
6. For resource creation, lock capacity and check the effective persisted limit.
7. Apply provider/environment gates where relevant.
8. Persist the domain write and required audit atomically.

Frontend checks are presentation preflight only. Server actions, APIs, and semantic commands remain the security and data-integrity authority.
