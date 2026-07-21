# Google Wallet readiness

## Phase W decision

LoyalFlow now has a provider-neutral, in-process readiness mapping in
`lib/google-wallet/readiness.ts`. It derives a presentation-only loyalty-pass
shape from existing tenant-scoped business/customer/card data. It does not
create passes, call Google APIs, sign JWTs, store balances, or enable an Add to
Google Wallet button.

The existing public card remains the source of truth and works unchanged while
the Google Wallet feature flag is disabled.

## Three separate layers

### A. Readiness layer — implemented now

- Maps one active Business plus one active, same-tenant Customer into a
  pass-ready representation.
- Includes business name/logo/colors, member name/code, balance, loyalty mode,
  reward progress/ready state, public-card URL/QR value, and a public offer
  summary.
- Uses existing reward-progress logic; it cannot mutate a loyalty ledger.
- Rejects tenant mismatch, inactive source, non-HTTPS card URL, malformed
  branding, and unsafe logo URL, with safe visual fallbacks.
- Has a disabled-by-default configuration boundary. It cannot activate the
  provider even if future environment values are supplied because no adapter
  exists.

### B. Provider integration — intentionally deferred

Google Wallet loyalty passes require issuer-controlled Class and Object
resources, then a signed Save-to-Wallet JWT/link. The REST workflow uses a
Google Cloud service account key; the JWT Save-to-Wallet flow needs approved
web origins. See Google’s official [loyalty card overview](https://developers.google.com/wallet/retail/loyalty-cards), [Class/Object model](https://developers.google.com/wallet/retail/loyalty-cards/overview/how-classes-objects-work), [web issuing guide](https://developers.google.com/wallet/retail/loyalty-cards/web), and [JWT reference](https://developers.google.com/wallet/reference/rest/v1/Jwt).

Phase W makes no REST request, creates no Class/Object, signs no JWT, and
creates no button/link. It must not be described as a working Google Wallet
integration.

### C. Production activation — separately approved

Before activation, the operator must provide and approve:

1. A Google Wallet issuer account/issuer ID and Google Wallet API access.
2. A Google Cloud service account permitted to manage issuer resources.
3. A production secret manager for the service-account credential; never put
   the private key in source control, client JavaScript, browser logs, or a
   public environment variable.
4. Canonical HTTPS production origin(s) matching the signed JWT `origins`.
5. Provider adapter implementation, security review, isolated testing, issuer
   approval requirements, and production deployment approval.

`GOOGLE_WALLET_ENABLED` and `GOOGLE_WALLET_ISSUER_ID` are reserved placeholders
only. The integration remains disabled; a service-account value is not added to
`.env.example` and must be injected server-side only after approval.

## Data mapping and privacy

The readiness layer maps a single existing membership. `tenantBusinessId` must
equal `customer.businessId`; otherwise no mapping is returned. It never queries
another business or wallet identity.

- **Member ID:** existing business-scoped customer code, not a global identity.
- **Barcode/public URL:** the existing HTTPS opaque public-card URL. Like the
  current QR card, it is a single-membership bearer capability and must never
  enumerate other memberships.
- **Offers:** callers may supply only offers already filtered by public
  eligibility. Internal audience/segment rules, notes, tags, and staff data are
  excluded.
- **Branding:** business branding is used only after URL/color sanitization.
- **Ledger:** balance, progress, and reward-ready state are derived at mapping
  time and never independently persisted by the wallet layer.

## Future pass lifecycle and synchronization

When an approved provider adapter exists, it should use the same tenant-scoped
write boundary as current loyalty actions:

```text
LoyalFlow earn/redeem/adjust/reward state change
  -> commit existing loyalty transaction atomically
  -> emit internal presentation-update event after commit
  -> coalesce by business/customer membership
  -> rebuild pass from source-of-truth mapping
  -> server-side provider patch of that membership's pass object
```

No event queue, webhook, background worker, or paid infrastructure is added in
Phase W. Until the adapter is approved, the feature state returns
`NOOP_DISABLED`; a loyalty write must never fail because a wallet refresh is
unavailable. Retry/idempotency, provider failure logging, object lifecycle,
and revocation need a separate internal-events design (Phase X).

## Failure handling requirements for activation

- Never roll back a committed LoyalFlow ledger write because a provider refresh
  fails.
- Do not log signed JWTs, service-account material, raw private keys, or full
  bearer URLs unnecessarily.
- Treat provider object IDs as tenant/customer scoped and prevent cross-tenant
  patch/read attempts.
- Keep the normal public card/PWA available when the provider is disabled or
  unavailable.

## Existing PWA/offline status

The public card already has a per-card manifest, generated icon, QR code, and
service-worker/offline support. These are independent of Google Wallet and are
not replaced by the readiness layer.
