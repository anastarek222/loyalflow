# TC4.5 Beta Branch and Team Expansion Entitlements

Date: 2026-08-13
Environment: isolated Staging Beta only

## Implemented boundary

- Branch creation and in-business team-account creation now enforce the canonical `EXPAND` lifecycle policy.
- Each path reads the persisted business lifecycle before expensive work and re-reads it inside the authoritative database transaction immediately before the resource write.
- Missing businesses and lifecycle changes fail closed with bounded UI feedback.
- Existing tenant, role/capability, plan-limit, validation, audit, notification, and uniqueness controls remain in force; subscription policy grants no permission.
- Existing branches, team accounts, and read surfaces remain available in restricted lifecycle states.

## Explicitly not included

- Branch editing, activation, staff assignment, account editing, password reset, and account activation are not reclassified by this expansion slice.
- Owner invitation and tenant bootstrap remain governed by the separate invitation-only TC7 boundary.
- Offers, rewards, campaigns, and the remaining operational/economic mutation paths remain later TC4 parity slices.
- No provider, checkout, webhook, credential, schema, migration, Production deployment, or Production data action is added.

## Expected expansion behavior

| State       | Add branch | Add team account |
| ----------- | ---------- | ---------------- |
| `PENDING`   | Deny       | Deny             |
| `TRIALING`  | Allow      | Allow            |
| `ACTIVE`    | Allow      | Allow            |
| `PAST_DUE`  | Deny       | Deny             |
| `SUSPENDED` | Deny       | Deny             |
| `CANCELED`  | Deny       | Deny             |
| `EXPIRED`   | Deny       | Deny             |
