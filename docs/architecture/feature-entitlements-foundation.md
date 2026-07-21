# Feature entitlements foundation

## Phase Y decision

LoyalFlow has one centralized `FREE` plan in `lib/entitlements.ts`. It grants
all currently implemented product features and adds no billing, payment method,
subscription record, paid dependency, remote plan lookup, or customer-facing
pricing change.

Future plans must be introduced only with an approved billing/authorization
design. Entitlement checks must remain tenant scoped, fail safely, and never
override a feature's separate permission, credential, provider, or production
activation gate. For example, the free readiness entitlement does not enable
Google Wallet credentials or pass issuance.
