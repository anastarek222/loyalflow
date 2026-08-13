# TC4.4 Beta Subscription Entitlement Enforcement

Date: 2026-08-13
Environment: isolated Staging Beta only

## Implemented boundary

- One provider-neutral operation policy maps the persisted lifecycle to `READ`, `EXPORT`, `OPERATE`, `EXPAND`, and `PURCHASE` intents.
- Reads and exports remain available in every lifecycle state so data is preserved and recoverable.
- Loyalty earn, reward redemption, and balance adjustment enforce `OPERATE` inside their existing database transaction before mutation.
- Completed idempotent operations may still return their prior result after a later lifecycle restriction; no new write occurs.
- Public and authenticated customer creation enforce `EXPAND` both before work and again inside the authoritative transaction, then fail with bounded UI states.
- Missing businesses fail closed.

## Explicitly not included

- No Stripe, checkout, webhook, provider credentials, or payment activation.
- No schema, migration, production deployment, or production data action.
- No claim of route-wide enforcement parity. Branch, team, offer, reward, campaign, and other expansion/write paths remain tracked for later Beta parity.

## Expected state behavior

| State       | Read/export | Operate loyalty          | Expand customers |
| ----------- | ----------- | ------------------------ | ---------------- |
| `PENDING`   | Allow       | Deny                     | Deny             |
| `TRIALING`  | Allow       | Allow                    | Allow            |
| `ACTIVE`    | Allow       | Allow                    | Allow            |
| `PAST_DUE`  | Allow       | Allow                    | Deny             |
| `SUSPENDED` | Allow       | Deny                     | Deny             |
| `CANCELED`  | Allow       | Allow for current period | Deny             |
| `EXPIRED`   | Allow       | Deny                     | Deny             |
