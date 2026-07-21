# Duplicate customer management

## Current safe behaviour

Phase R is a tenant-scoped, read-only review workflow. It detects groups only
within one business and exposes the matching signal, balance, loyalty history
counts, rewards/redemptions, tags, private-note previews, referrals, and recent
activity to Owner/Manager customer editors.

- Exact phone and customer-code values are already unique per business.
- Review normalizes phone punctuation/spacing to find legacy or imported values
  that represent the same number but were stored differently.
- The current `Customer` model deliberately has no persisted email; therefore
  email comparison is supported by the shared detection helper for a future
  approved email field, but no email group is produced today.
- Staff, Viewers, public cards, exports, and other tenants cannot access the
  duplicate-review page or any private review data.

## Deliberately disabled merge

No merge action, migration, data rewrite, balance update, public-token redirect,
or customer deletion is introduced in Phase R. A read-only preview nominates the
oldest customer as a candidate survivor only to make the human decision visible;
it is not an instruction to merge.

An approved future merge design must be a single audited transaction or a
carefully recoverable workflow that:

1. Locks the selected same-tenant customers and explicitly confirms the survivor.
2. Preserves every original loyalty transaction and its historical
   `balanceAfter`; it must never synthesize or duplicate transferred ledger rows.
3. Defines a reviewed balance/lifetime policy rather than adding two current
   balances blindly.
4. Reparents or preserves rewards, redemptions, reward unlocks, promotions,
   referrals, tags, notes, activity, and branch context without violating their
   tenant constraints or unique keys.
5. Retains a safe public-card strategy for both opaque tokens, including a
   reversible alias/redirect policy and privacy review.
6. Records an immutable merge audit record with actor, source IDs, survivor ID,
   preview snapshot, policy version, and rollback/recovery strategy.

Those are irreversible ledger and identity-policy decisions. They require an
approved design and dedicated database/UAT verification before any merge can be
enabled.
