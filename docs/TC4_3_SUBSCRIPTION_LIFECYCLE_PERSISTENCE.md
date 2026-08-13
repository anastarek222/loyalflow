# TC4.3 Beta subscription lifecycle persistence

Status: implemented and locally verified; isolated Staging migration/runtime UAT required.

TC4.3 persists the already-approved provider-neutral subscription lifecycle on
each business. The additive migration backfills the existing manual billing
state without deleting or rewriting billing history:

- `TRIAL` becomes `TRIALING`;
- `PAID` and `DUE` become `ACTIVE`;
- `OVERDUE` becomes `PAST_DUE`;
- `SUSPENDED` remains `SUSPENDED`.

The runtime accepts only approved lifecycle events, rejects invalid transitions,
and uses a versioned compare-and-swap update so concurrent events cannot silently
overwrite each other. Every successful transition records bounded business audit
metadata. The mutation is restricted to the existing Super Admin boundary.

This Beta slice does not select or activate Stripe or another payment provider,
does not implement checkout or webhooks, does not infer retry/idempotency rules
for provider events, and does not change runtime entitlements. It performs no
Production action. Provider activation, entitlement enforcement, and isolated
Staging migration/runtime evidence remain in the Beta Deferred Register.
