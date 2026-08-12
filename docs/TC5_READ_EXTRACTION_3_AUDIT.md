# TC5 Read Extraction 3 Audit

## Decision

The bounded third slice is `GET /api/v1/business/access`. It returns the
effective role capabilities and plan feature entitlements for the business
already attached to the authenticated NextAuth session.

## Reuse and boundary audit

- Capability semantics come directly from `canPerform` and the canonical
  `capabilities` list; no new role policy is introduced.
- Entitlement semantics come directly from `getPlanEntitlements` and the
  canonical plan catalogue; no provider or billing lifecycle is activated.
- The browser supplies no tenant ID, slug, role, plan, or capability.
- The database query selects only the current session business plan. The DTO
  returns only string identifiers for effective capabilities and entitlements.
- It excludes plan price, billing/payment state, limits/usage, contacts,
  customer data, notes, credentials, and provider state.
- Unauthenticated, no-tenant, missing-capability, missing-business, and
  internal-error paths remain fail-closed through the established v1 adapter.

## Constraints

This slice adds no schema, migration, write, provider, credential,
infrastructure, session-persistence, or Production change. It does not claim an
externally published stable consumer contract.
