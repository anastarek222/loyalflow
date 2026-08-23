# TC5 API Foundation Audit

Date: 2026-08-12

Status: first pure/read-only foundation slice implemented

## Approved decisions

- Browser/API topology is a same-origin BFF. Browsers use Next.js Route
  Handlers and never access Prisma, PostgreSQL, or providers directly.
- Server Components may use the domain/query layer directly; internal HTTP is
  not mandatory. APIs exist for external consumers or genuine Client Component
  needs only.
- Backend hosting remains Next.js/Vercel Functions in the current LoyalFlow
  application. No separate backend, microservice, service, infrastructure, or
  credential is introduced.
- Protected routes reuse the current NextAuth session as the sole identity
  source. User, business, role, and capabilities are server-derived. Client
  tenant IDs and roles are never trusted. Existing public-token routes remain
  the limited public exception.
- New public API paths use `/api/v1`; compatible evolution is additive and a
  breaking contract requires `/api/v2`. Deprecation uses `Deprecation` and
  `Sunset` communication plus migration documentation, with a default 90-day
  window unless a security risk requires faster removal.
- TC5 is read-only. No write API, new CSRF policy, session persistence change,
  or externally published stability claim is included.

## Implemented bounded slice

- Transport-neutral v1 success/problem envelopes and version metadata live in
  `@loyalflow/contracts` without Next.js or Prisma imports.
- The Route Handler adapter validates or generates a correlation ID, returns it
  in the envelope and `X-Request-ID`, applies sensitive-data `no-store`, and
  provides a generic internal-error response that cannot expose stacks or
  Prisma/provider errors.
- The protected actor adapter consumes only the current server session and
  existing capability policy. Cross-tenant selectors fail without disclosure;
  no client role or tenant authority is accepted.
- `/api/v1/version` and `/api/v1/health/live` are additive public read-only
  foundation endpoints. They expose safe service/release metadata only and are
  explicitly labelled `INTERNAL_FOUNDATION`, not externally stable.
- Existing health and API routes remain unchanged compatibility paths.

## Deferred TC5 work

Authenticated business/customer/reward/report reads, typed clients/OpenAPI,
read-parity observation, safe writes, ledger writes, and legacy removal remain
separate slices with their applicable G08-G12 and G16 evidence. No persistence,
schema, migration, provider, credential, or Production action is included.
