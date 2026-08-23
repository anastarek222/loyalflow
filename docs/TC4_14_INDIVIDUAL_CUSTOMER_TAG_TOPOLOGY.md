# TC4.14 Beta Individual Customer Tag Topology

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Creating a new business tag through a customer profile is classified as `EXPAND`.
- Assigning an existing tag or removing an existing assignment is classified as `OPERATE`.
- Each mutation receives a persisted-state precheck and a transaction-time recheck immediately before tag, assignment, or audit writes.
- Tag creation and first assignment now share one authoritative transaction.

## Concurrency and replay

- Existing assignments remain write-free replay.
- Assignment creation uses the unique customer/tag authority with duplicate skipping; audit is written only for a newly created assignment.
- Removal writes audit only when the assignment still exists.
- Existing tenant, capability, plan-feature, validation, and read-access controls remain authoritative.

## Explicitly deferred

- Bulk tag assignment/removal remains separate parity work.
- Referral identities remain tracked by the independent TC4.12 Draft PR.
- Business settings, providers, checkout, schema, migrations, and Production are not changed.
