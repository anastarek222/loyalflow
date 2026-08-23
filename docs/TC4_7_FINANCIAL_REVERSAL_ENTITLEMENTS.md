# TC4.7 Beta Financial Reversal Entitlements

Date: 2026-08-13
Environment: isolated Staging Beta only

## Implemented boundary

- New earn refund/void and redemption-reversal ledger writes enforce the canonical persisted-lifecycle `OPERATE` policy.
- The lifecycle check runs inside the authoritative database transaction after tenant, actor, operation-context, and customer-lock validation, and before any new balance, unlock, ledger, exception, audit, or notification write.
- Identical completed operations still return their persisted idempotent replay result in restricted lifecycle states. Identical persisted insufficient-balance exceptions also keep their prior bounded result.
- Missing businesses and restricted lifecycle states fail closed with bounded Arabic and English feedback.
- Existing ledger history, customer data, and read surfaces remain available.

## Campaign audit

The current campaign surface prepares manual WhatsApp drafts from existing data. It does not persist a campaign resource or execute a provider send, so there is no campaign expansion writer to guard in this slice. Provider execution remains deferred.

## Explicitly not included

- Editing existing branches, staff, offers, rewards, or customer metadata is not reclassified by this slice.
- No provider, send execution, checkout, webhook, credential, schema, migration, Production deployment, or Production data action is added.
- This slice does not claim route-wide TC4 write parity.

## Expected financial-reversal behavior

| State       | New earn reversal | New redemption reversal | Identical completed replay |
| ----------- | ----------------- | ----------------------- | -------------------------- |
| `PENDING`   | Deny              | Deny                    | Return prior result        |
| `TRIALING`  | Allow             | Allow                   | Return prior result        |
| `ACTIVE`    | Allow             | Allow                   | Return prior result        |
| `PAST_DUE`  | Allow             | Allow                   | Return prior result        |
| `SUSPENDED` | Deny              | Deny                    | Return prior result        |
| `CANCELED`  | Allow             | Allow                   | Return prior result        |
| `EXPIRED`   | Deny              | Deny                    | Return prior result        |
