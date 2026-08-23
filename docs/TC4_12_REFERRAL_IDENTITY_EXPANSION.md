# TC4.12 Beta Referral Identity Expansion

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Creating a new customer referral code now enforces the canonical persisted-lifecycle `EXPAND` policy.
- An existing code remains readable/replayable without creating a new identity or write.
- New creation checks persisted lifecycle state before candidate generation and re-reads it inside the authoritative transaction immediately before the referral-code write.
- The existing tenant, capability, plan-feature, collision retry, customer ownership, cache revalidation, and public-link privacy boundaries remain authoritative. Subscription state grants no permission.

## Concurrency and replay behavior

- The existing unique tenant/customer identity remains the idempotent authority.
- A concurrent unique conflict re-checks for a code created by the other request and treats that durable result as success.
- Candidate-code collisions continue to retry within the existing bounded ten-attempt limit.
- A lifecycle transition to a restricted state before the transaction prevents the new identity write.

## Explicitly deferred

- Customer tag creation, assignment, and removal remain a separate topology slice because the current tag upsert occurs outside the assignment transaction.
- Referral rewards, campaign execution, business settings, providers, checkout, and billing activation are not changed.
- No provider, credential, schema, migration, Production deployment, or Production data action is added.
- This slice does not claim route-wide TC4 write parity.

## Expected behavior

| State       | Create new code | Reuse existing code | Read existing customer |
| ----------- | --------------- | ------------------- | ---------------------- |
| `PENDING`   | Deny            | Allow               | Allow                  |
| `TRIALING`  | Allow           | Allow               | Allow                  |
| `ACTIVE`    | Allow           | Allow               | Allow                  |
| `PAST_DUE`  | Deny            | Allow               | Allow                  |
| `SUSPENDED` | Deny            | Allow               | Allow                  |
| `CANCELED`  | Deny            | Allow               | Allow                  |
| `EXPIRED`   | Deny            | Allow               | Allow                  |
