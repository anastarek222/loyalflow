# Multi-branch foundation

## Current model

A `Business` owns customers, staff, transactions, redemptions, and activities.
There is no location identifier, so current reports are business-wide. Adding a
branch by overloading a business would fragment customers and break the current
tenant model.

## Proposed backward-compatible model

```text
Business
  ├─ Branch
  ├─ Customer (business-wide membership)
  ├─ User ── BranchStaffAssignment ── Branch
  └─ LoyaltyTransaction / RewardRedemption / BusinessActivity -> nullable Branch
```

- A customer remains owned by one business and can transact at any active branch.
- `Branch` has `businessId`, name, optional address/contact phone, active status,
  and timestamps. Names are unique within a business.
- Add nullable `branchId` to operational records. Nullable preserves all history
  as an "unassigned / pre-branch" aggregate.
- Use an explicit staff-assignment join table rather than a single branch field
  on `User`; owners and staff may need access to more than one location.
- The assignment stores its business ID and has composite foreign keys to both
  the branch and user, so the database rejects a cross-tenant assignment even
  if a caller bypasses the application helper.
- Require every selected `branchId` to belong to the same `businessId` and be
  active in the write transaction. Never trust a branch identifier sent by the
  browser.
- Owners and managers retain business-wide branch access. Cashier/staff users
  need an explicit `BranchStaffAssignment`; viewers may inspect branch-scoped
  data but cannot create loyalty writes.
- Rewards, promotions, referrals, and customers remain business-wide in this
  foundation. Branch-specific catalogues, policies, and customer ownership are
  intentionally out of scope.

## Compatibility and rollout

1. Add only nullable fields/tables and indexes; do not split or duplicate
   existing customers or transactions.
2. Keep branch selection optional while no branches exist. No default branch is
   necessary and none is created automatically.
3. Backfill no historical branch automatically. Report it as business-wide.
4. New loyalty earn, redemption, and adjustment helpers accept an optional
   branch context and atomically attach it to their transaction and activity
   records only after validating the active, same-tenant branch.
5. Existing screens deliberately continue to submit no branch context until a
   branch-management/selection experience is introduced. This preserves current
   single-location behavior and prevents an unaudited implicit assignment.
6. The optional `branchId` indexes support report filtering and branch
   comparison. Unfiltered reports continue to include historical `NULL`
   branch records in the business total.

## Required verification

- A staff member cannot record a transaction for a branch in another business.
- Business-wide reports retain all historical, unassigned activity.
- Branch reports include only that branch after assignment.
- Deactivating a branch prevents new writes without deleting its history.
- Existing historical records remain `NULL` branch context after migration.
