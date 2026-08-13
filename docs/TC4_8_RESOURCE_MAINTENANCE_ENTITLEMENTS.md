# TC4.8 Beta Resource Maintenance Entitlements

Date: 2026-08-13
Environment: isolated Staging Beta only

## Implemented boundary

- Editing and activating/deactivating existing branches, offers, and rewards now enforce the canonical persisted-lifecycle `OPERATE` policy.
- Each path checks the lifecycle before resource lookup and re-reads it inside the authoritative transaction immediately before the resource and audit writes.
- Missing businesses and restricted lifecycle states fail closed with bounded Arabic and English feedback.
- Existing tenant, capability, validation, feature, audit, and read-access controls remain authoritative. Subscription state grants no permission.
- Creating new branches, offers, and rewards remains separately classified and protected as `EXPAND`.

## Explicitly not included

- Branch staff assignment/removal and team-account/security administration remain a separate admin-parity slice.
- Customer profile, status, referral, tag, and note maintenance remain later operational/admin parity work.
- Business settings, Custom Card lifecycle, integration sync, destructive tenant deletion, trusted provider events, checkout, and billing activation are not changed.
- No provider, credential, schema, migration, Production deployment, or Production data action is added.
- This slice does not claim route-wide TC4 write parity.

## Expected maintenance behavior

| State       | Edit resource | Activate/deactivate | Read existing resource |
| ----------- | ------------- | ------------------- | ---------------------- |
| `PENDING`   | Deny          | Deny                | Allow                  |
| `TRIALING`  | Allow         | Allow               | Allow                  |
| `ACTIVE`    | Allow         | Allow               | Allow                  |
| `PAST_DUE`  | Allow         | Allow               | Allow                  |
| `SUSPENDED` | Deny          | Deny                | Allow                  |
| `CANCELED`  | Allow         | Allow               | Allow                  |
| `EXPIRED`   | Deny          | Deny                | Allow                  |
