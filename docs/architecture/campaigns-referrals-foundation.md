# Campaign and referral foundation

## Current campaign foundation

`lib/campaigns/suggestions.ts` creates a provider-independent, staff-reviewed
WhatsApp handoff for the existing customer page. It supports these internal
triggers without calling a paid messaging API:

- customer created → Welcome
- loyalty earned and reward ready → Reward ready
- loyalty earned and one action away (visits/points only) → One away
- loyalty earned, redeemed, or manually adjusted → Balance updated

The handoff only constructs a link and message. It does not send, schedule, or
claim delivery. This keeps staff in control and avoids a provider dependency.

`Birthday` is intentionally not implemented: the current `Customer` model has
no birth date or consent field.

## Persistent campaign design

A persistent campaign system requires a reviewed additive migration:

```text
CampaignTemplate (businessId, trigger, body, enabled)
CampaignEvent (businessId, customerId, trigger, idempotencyKey, createdAt)
CampaignDelivery (campaignEventId, channel, status, providerMessageId?, sentAt?)
```

- `idempotencyKey` must be unique per business/customer/trigger/window to stop
  duplicate delivery when an action retries.
- Customer consent and a quiet-hours policy must be modeled before automated
  delivery.
- A worker/cron can create events, but provider adapters must remain optional;
  the initial adapter can remain the manual WhatsApp handoff.

## Referral design

Do not add a referral reward to the current `Customer` table. The safe additive
model is:

```text
CustomerReferralCode (customerId, businessId, code, active)
Referral (businessId, referrerCustomerId, referredCustomerId, status, createdAt)
ReferralReward (referralId, recipientCustomerId, loyaltyTransactionId, grantedAt)
```

Required invariants:

- A code resolves only within its `businessId`.
- A referrer cannot refer themselves.
- The same referred customer can create at most one accepted referral per
  business.
- A referral reward must reference exactly one loyalty transaction and be
  protected by a unique referral/recipient constraint.
- Awarding is performed in one tenant-scoped database transaction with an
  activity record.

## Implemented attribution scope (Phase N)

Phase N prepares an additive attribution-only migration:

```text
CustomerReferralCode (businessId, customerId, opaque code, active)
Referral (businessId, referrerCustomerId, referredCustomerId, RECORDED)
```

The registration path creates a referral only when the submitted code resolves
to an active customer in the same business. A unique business/referred-customer
constraint prevents duplicate attribution. It records `REFERRAL_RECORDED` for
audit, but does **not** grant points, alter a balance, create a loyalty
transaction, or call a provider.

Referral rewards remain deferred: their amount, recipient(s), qualification,
reversal, and customer consent need an approved commercial/loyalty policy
before a reward model or write path is introduced.
