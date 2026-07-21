# Customer identity and wallet foundation

## Phase V decision

Phase V does **not** add a global identity table, customer login, or wallet UI.
The current application has tenant-scoped `Customer` records and staff-only
credentials, but no verified customer contact channel, consent record, account
recovery, or customer authentication. A real wallet would make an irreversible
identity/privacy decision without the required controls.

The executable contract in `lib/wallet/foundation.ts` makes automatic phone
linking and public-card wallet enumeration impossible in this phase.

## Current model audit

| Area | Current behaviour | Wallet consequence |
| --- | --- | --- |
| Customer | A loyalty account scoped to one `Business`; phone/code are unique only within that business. | It is a membership, not a global person. |
| Public card | One opaque bearer `publicToken` per customer record. | It opens one card only and must never enumerate a wallet. |
| QR/self-signup | Normalizes phone and creates a customer only in the scanned business. | Equal phones in different tenants remain unrelated. |
| Ledger/CRM data | Transactions, rewards, referrals, notes, tags, and activities belong to the tenant customer. | Wallet work cannot move, merge, or share them. |
| Duplicate review | Tenant-only and read-only. | It is not identity resolution. |
| Authentication | NextAuth credentials authenticates staff `User` accounts. | It cannot authenticate or recover customer access. |
| Customer contact | Phone is unverified; customer email is not persisted. | Neither is safe for global identity or magic links. |

## Required separation

```text
GlobalCustomerIdentity (optional platform person)
       │ verified, explicit consent only
       ├── CustomerIdentityCredential (hashed verified identifier)
       └── WalletMembershipLink ── Customer (existing business membership)
                                      └── Business (tenant)
```

- **Global identity:** optional platform person, created only after a verified,
  customer-initiated claim; never inferred from phone, name, referral, code,
  public token, or duplicate review.
- **Business membership:** the existing `Customer` remains the authoritative
  owner of one business's balances and ledger. A future link never changes its
  business, public token, transactions, or constraints.
- **Business record:** staff keep seeing only their business's records. Staff
  must never discover wallet links or memberships in another tenant.

## Staged rollout

### Stage 1 — current, non-destructive foundation

- No schema, identity links, or wallet UI.
- All public-card URLs and tokens remain unchanged.
- Tests guard against automatic linking, token enumeration, revoked access,
  identity conflicts, and cross-tenant leakage.

### Stage 2 — optional additive global identity foundation

Only after policy approval, introduce additive nullable tables such as:

```text
GlobalCustomerIdentity(id, status, createdAt, revokedAt)
CustomerIdentityCredential(id, identityId, kind, lookupHash, verifiedAt, revokedAt)
WalletMembershipLink(id, identityId, customerId, businessId, status, consentedAt, revokedAt)
```

- Keep existing `Customer` IDs and all foreign keys unchanged; never backfill
  matching identities automatically.
- Store only a keyed hash/pepper of a verified normalized identifier. Never
  make raw customer phone globally unique.
- Make each customer membership link unique, while an identity can have many
  explicitly linked memberships.
- Revocation ends wallet access only; it never deletes a balance, ledger row,
  reward, referral, tag, note, activity, or public card.

### Stage 3 — verified claim and customer authentication

Every claim needs a verified wallet session, customer-initiated request, fresh
explicit consent, and a non-disclosing conflict refusal. Current free-only
assessment:

- Paid SMS OTP is not acceptable and is not introduced.
- Email magic links are not ready: customers have no verified email and no
  transactional delivery/recovery infrastructure.
- Staff credentials are prohibited for customers; they are separate domains.
- A future in-person, single-use claim code is possible only with an additive
  claim/session schema, expiry, rate limits, audit trail, consent, and approved
  recovery policy.

### Stage 4 — wallet UI

Only after Stages 2–3 are database- and UAT-verified may `/my-loyalflow` show
the verified session's explicitly `LINKED` memberships. It can show each
business's existing balance/progress but never unlinked memberships, private
notes/tags, staff activity, or evidence that another business has a customer.

## Non-negotiable boundaries

- Never automatically link by phone, email, name, code, referral, or token.
- Never let a public card discover sibling memberships.
- Never let a business see another tenant's customers or links.
- Treat public cards as independently revocable bearer capabilities, not wallet
  sessions.
- Refuse unverified sessions, revoked links, and identity conflicts without
  revealing a conflicting business or customer.

## Preconditions for a future migration

1. Approve customer identity, consent, recovery, retention, and deletion policy.
2. Choose a free verification channel or explicitly approve a provider.
3. Review additive schema, identifier hashing, token rotation, and audit rules.
4. Run isolated database verification and browser UAT before enabling a wallet.
