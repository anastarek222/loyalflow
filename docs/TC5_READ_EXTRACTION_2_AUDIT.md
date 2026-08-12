# TC5 Read Extraction 2 Audit

## Decision

The bounded second slice is `GET /api/v1/business/summary`. It returns a small
operational summary for the business already attached to the authenticated
NextAuth session.

## Boundary audit

- The browser supplies no business ID, slug, role, or capability.
- The server derives user, business, role, and capability from the existing
  session and permission model.
- An unauthenticated request is `401`; an authenticated identity without a
  tenant is `404`; a missing capability is `403`.
- The query is constrained by the session-derived business ID before data is
  projected into the transport-neutral DTO.
- The DTO contains only business identity, active state, loyalty programme
  labels/rules, and aggregate customer/branch counts. It excludes contacts,
  billing, administrative notes, credentials, and customer records.
- Internal failures use the generic v1 problem envelope without stack, Prisma,
  provider, or database details.

## Constraints

This slice adds no schema, migration, write, provider, credential,
infrastructure, or Production change. It does not create an external-consumer
stability promise. Unsupported-method `no-store` normalization remains the
documented follow-up from PR #71.
