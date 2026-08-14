# TC4.13 Beta Bulk Customer Reactivation Parity

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Bulk reactivation of existing customers now enforces the canonical persisted-lifecycle `OPERATE` policy, closing the bulk bypass left after TC4.11 guarded the individual action.
- The bulk path selects persisted lifecycle state, checks it before activity request-context work, and re-reads it inside the authoritative transaction immediately before customer and audit writes.
- A no-op selection with no inactive customer remains replayable without a subscription check or write.
- Existing tenant, capability, plan-feature, all-or-nothing selection, audit, cache revalidation, and safe Google Sheets synchronization boundaries remain authoritative.

## Safety control preserved

- Bulk deactivation remains available in every lifecycle state.
- Runtime checks are conditional on `ACTIVATE`, so restricted businesses can still stop invalid or compromised customer identities.
- Google Sheets synchronization does not run after a subscription rejection.

## Explicitly deferred

- Individual and bulk customer tag creation/assignment/removal remain separate topology work.
- Referral identities remain tracked by the independent unmerged TC4.12 Draft PR.
- Business settings, providers, checkout, schema, migrations, and Production are not changed.
- This slice does not claim route-wide TC4 write parity.

## Expected behavior

| State       | Bulk reactivate | Bulk deactivate | No-op replay |
| ----------- | --------------- | --------------- | ------------ |
| `PENDING`   | Deny            | Allow           | Allow        |
| `TRIALING`  | Allow           | Allow           | Allow        |
| `ACTIVE`    | Allow           | Allow           | Allow        |
| `PAST_DUE`  | Allow           | Allow           | Allow        |
| `SUSPENDED` | Deny            | Allow           | Allow        |
| `CANCELED`  | Allow           | Allow           | Allow        |
| `EXPIRED`   | Deny            | Allow           | Allow        |
