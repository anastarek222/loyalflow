# TC4.6 Beta Offer and Reward Expansion Entitlements

Date: 2026-08-13
Environment: isolated Staging Beta only

## Implemented boundary

- Offer creation and reward-catalog creation enforce the canonical persisted-lifecycle `EXPAND` policy.
- Each path checks the lifecycle before plan work and re-reads it inside the authoritative transaction immediately before resource creation.
- Lifecycle changes and missing businesses fail closed with bounded Arabic and English feedback.
- Existing tenant/capability, validation, plan-feature, editable plan-limit, uniqueness, and audit controls remain authoritative; subscription policy grants no permission.
- Existing offers, rewards, and read surfaces remain available in restricted lifecycle states.

## Explicitly not included

- Editing or activating existing offers and rewards is not reclassified by this expansion slice.
- Reward redemption remains protected separately as an `OPERATE` financial mutation.
- Campaigns and remaining operational/economic mutation paths remain later TC4 parity work.
- No provider, checkout, webhook, credential, schema, migration, Production deployment, or Production data action is added.

## Expected expansion behavior

| State       | Add offer | Add reward |
| ----------- | --------- | ---------- |
| `PENDING`   | Deny      | Deny       |
| `TRIALING`  | Allow     | Allow      |
| `ACTIVE`    | Allow     | Allow      |
| `PAST_DUE`  | Deny      | Deny       |
| `SUSPENDED` | Deny      | Deny       |
| `CANCELED`  | Deny      | Deny       |
| `EXPIRED`   | Deny      | Deny       |
