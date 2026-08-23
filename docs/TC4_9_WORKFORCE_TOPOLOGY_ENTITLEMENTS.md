# TC4.9 Beta Workforce Topology Entitlements

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Assigning/removing staff at branches and changing a team account's experience access now enforce the canonical persisted-lifecycle `OPERATE` policy.
- Each path checks lifecycle state before target lookup and re-reads it inside the authoritative transaction immediately before topology and audit writes.
- Existing tenant, capability, role, eligibility, validation, duplicate-assignment, audit, and read-access controls remain authoritative. Subscription state grants no permission.
- Creating a new team account remains separately classified and protected as `EXPAND`.

## Security controls intentionally preserved

- Account activation/deactivation and password reset are not subscription-gated by this slice.
- Account deactivation is enforced through active-user session validation, while password reset increments `authVersion`; both must remain available to contain a compromised account or restore secure access in restricted lifecycle states.
- This is an explicit security boundary, not missing entitlement coverage.

## Explicitly not included

- Customer profile, status, referral, tag, and note maintenance remain later operational/admin parity work.
- Business settings, Custom Card lifecycle, integration sync, destructive tenant deletion, trusted provider events, checkout, and billing activation are not changed.
- No provider, credential, schema, migration, Production deployment, or Production data action is added.
- This slice does not claim route-wide TC4 write parity.

## Expected workforce-topology behavior

| State       | Add team account | Change operational access | Security status/password | Read existing accounts |
| ----------- | ---------------- | ------------------------- | ------------------------ | ---------------------- |
| `PENDING`   | Deny             | Deny                      | Allow                    | Allow                  |
| `TRIALING`  | Allow            | Allow                     | Allow                    | Allow                  |
| `ACTIVE`    | Allow            | Allow                     | Allow                    | Allow                  |
| `PAST_DUE`  | Deny             | Allow                     | Allow                    | Allow                  |
| `SUSPENDED` | Deny             | Deny                      | Allow                    | Allow                  |
| `CANCELED`  | Deny             | Allow                     | Allow                    | Allow                  |
| `EXPIRED`   | Deny             | Deny                      | Allow                    | Allow                  |
