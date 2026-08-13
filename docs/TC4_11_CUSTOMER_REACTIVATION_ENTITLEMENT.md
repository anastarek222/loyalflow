# TC4.11 Beta Customer Reactivation Entitlement

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Reactivating an existing customer now enforces the canonical persisted-lifecycle `OPERATE` policy.
- The path checks lifecycle state before activity request-context work and re-reads it inside the authoritative transaction immediately before the customer and audit writes.
- Restricted states keep the existing customer readable and receive the bounded bilingual subscription feedback.
- Existing tenant, capability, validation, audit, cache revalidation, and safe Google Sheets synchronization boundaries remain authoritative. Subscription state grants no permission.

## Safety control preserved

- Customer deactivation remains available in every lifecycle state.
- The runtime check is conditional on the requested active state, so a restricted business can still stop an invalid or compromised customer identity.
- Google Sheets synchronization runs only after the authoritative transaction succeeds.

## Explicitly deferred

- Referral-code creation and customer tag creation/assignment/removal remain separate identity/topology parity work.
- Business settings, Custom Card lifecycle, integration sync, destructive tenant deletion, trusted provider events, checkout, and billing activation are not changed.
- No provider, credential, schema, migration, Production deployment, or Production data action is added.
- This slice does not claim route-wide TC4 write parity.

## Expected behavior

| State       | Reactivate customer | Deactivate customer | Read existing record |
| ----------- | ------------------- | ------------------- | -------------------- |
| `PENDING`   | Deny                | Allow               | Allow                |
| `TRIALING`  | Allow               | Allow               | Allow                |
| `ACTIVE`    | Allow               | Allow               | Allow                |
| `PAST_DUE`  | Allow               | Allow               | Allow                |
| `SUSPENDED` | Deny                | Allow               | Allow                |
| `CANCELED`  | Allow               | Allow               | Allow                |
| `EXPIRED`   | Deny                | Allow               | Allow                |
