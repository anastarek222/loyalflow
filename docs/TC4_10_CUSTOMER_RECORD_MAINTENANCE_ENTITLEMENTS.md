# TC4.10 Beta Customer Record Maintenance Entitlements

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Editing an existing customer's profile and creating/updating internal customer notes now enforce the canonical persisted-lifecycle `OPERATE` policy.
- Each path checks lifecycle state before duplicate/target lookup and re-reads it inside the authoritative transaction immediately before record and audit writes.
- Existing tenant, capability, feature, validation, duplicate-phone, audit, read-access, and safe Google Sheets synchronization boundaries remain authoritative. Subscription state grants no permission.
- Restricted states receive bounded Arabic and English feedback while existing customer records remain readable.

## Safety control intentionally preserved

- Customer activation/deactivation is not subscription-gated by this slice.
- Deactivation must remain available to stop an invalid or compromised customer identity from performing loyalty operations in restricted states.
- Reactivation policy remains explicit later parity work; this slice does not silently reclassify the combined status action.

## Explicitly deferred

- Referral-code creation is a new customer-linked identity and remains unclassified pending a bounded `EXPAND` slice.
- Tag creation/assignment/removal requires restructuring the current pre-transaction tag upsert and remains a separate topology slice.
- Business settings, Custom Card lifecycle, integration sync, destructive tenant deletion, trusted provider events, checkout, and billing activation are not changed.
- No provider, credential, schema, migration, Production deployment, or Production data action is added.
- This slice does not claim route-wide TC4 write parity.

## Expected record-maintenance behavior

| State       | Edit profile/notes | Deactivate customer | Read existing record |
| ----------- | ------------------ | ------------------- | -------------------- |
| `PENDING`   | Deny               | Allow               | Allow                |
| `TRIALING`  | Allow              | Allow               | Allow                |
| `ACTIVE`    | Allow              | Allow               | Allow                |
| `PAST_DUE`  | Allow              | Allow               | Allow                |
| `SUSPENDED` | Deny               | Allow               | Allow                |
| `CANCELED`  | Allow              | Allow               | Allow                |
| `EXPIRED`   | Deny               | Allow               | Allow                |
