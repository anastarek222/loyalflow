# TC5 Read Foundation Completion Audit

Date: 2026-08-13
Base: `staging` at merge commit `af773c80cb173ea9cc71a1deea3cec26f1768fcf`

## Conclusion

The approved TC5 **read foundation** is complete for the application's current
consumption model. It provides a versioned, same-origin, read-only BFF boundary
with transport-neutral contracts, safe envelopes, correlation IDs, cache
defaults, and session-derived tenant/capability adapters. This does not mark the
broader TC5 backend extraction complete and does not claim an externally stable
API.

The current UI does not consume `/api/v1`. Server Components and Server Actions
continue to call domain/query code directly, which is explicitly allowed by the
approved topology and avoids internal HTTP hops. New APIs should be introduced
only for real Client Component or external-consumer needs.

## `/api/v1` inventory

| Endpoint | Access | Contract/data | Persistence | Verified controls |
| --- | --- | --- | --- | --- |
| `GET /api/v1/version` | public | service, `v1`, `INTERNAL_FOUNDATION`, safe release metadata | none | v1 success envelope, request ID, `no-store`, `nosniff` |
| `GET /api/v1/health/live` | public | liveness and safe release metadata | none | v1 success envelope, request ID, `no-store`, `nosniff` |
| `GET /api/v1/business/summary` | current authenticated business with `CUSTOMERS_VIEW` | business identity/active state, programme rules, aggregate customer/branch counts | one tenant-ID-scoped read | 401/403/404 fail-closed paths, generic 500, minimized DTO, request ID, `no-store` |
| `GET /api/v1/business/access` | current authenticated business with `CUSTOMERS_VIEW` | effective capability and plan-entitlement identifiers only | one tenant-ID-scoped plan read | 401/403/404 fail-closed paths, canonical policy reuse, generic 500, request ID, `no-store` |

All DTO/envelope types are exported from `@loyalflow/contracts/api/v1` without
Next.js, Prisma, React, environment, or fetch dependencies. The runtime adapter
is split into:

- `lib/api/v1/response.ts`: success/problem envelopes, generic internal error,
  safe bounded request IDs, `no-store`, and `nosniff`;
- `lib/api/v1/actor-policy.ts`: pure session/tenant/capability resolution;
- `lib/api/v1/actor-context.ts`: the server-only NextAuth adapter;
- `lib/business/api-summary*.ts`: tenant-scoped query and DTO projection;
- `lib/business/api-access*.ts`: tenant-scoped plan query and canonical
  capability/entitlement projection.

## Coverage assessment

| Control | Coverage and evidence | Residual status |
| --- | --- | --- |
| Authentication | protected reads use the current NextAuth session only; unauthenticated Preview UAT returned the v1 401 envelope; isolated-Staging authenticated UAT returned 200 for both protected reads with a disposable Owner session | completed for the bounded read foundation; the synthetic Owner fixture was removed and verified at zero |
| Tenant isolation | business endpoints accept no client tenant ID or slug; the tenant comes from the session and the query uses that ID; runtime UAT supplied conflicting `tenantId`, `slug`, and `role=SUPER_ADMIN` inputs and still returned only the session business/Owner projection | negative unit/contract coverage and session-bound runtime replay pass; no Super Admin fixture was used |
| Capability | `getOwnBusinessApiActor("CUSTOMERS_VIEW")` reuses `canPerform`; denied and no-tenant paths are fail-closed | no new role semantics introduced |
| Entitlements | access projection reuses `getPlanEntitlements` and the canonical plan catalogue | provider activation and billing lifecycle are explicitly outside this read DTO |
| Cache safety | every implemented v1 success/problem response uses `Cache-Control: no-store, max-age=0`; PRs #92 and #93 added explicit safe 405 responses with `Allow: GET`, `nosniff`, and the bounded v1 problem envelope | no open cache-safety exception remains for the four current endpoints |
| Correlation | accepted IDs match a 1-64 character safe allow-list; unsafe input is replaced by a UUID; header and envelope IDs match | no distributed trace/store is introduced |
| Error disclosure | known problems use bounded codes/messages; caught runtime failures use one generic 500 without stack/Prisma/provider detail | public/version handlers have no database/provider failure surface |
| Writes | no v1 route implements a write path; explicit POST, PUT, PATCH, and DELETE handlers return the shared 405 problem before auth or persistence | no v1 write architecture exists or is claimed |

Focused TC5 coverage now includes the unsupported-method hardening tests across foundation, business summary, and business access. The latest post-hardening verification recorded 6/6 focused tests and 912/912 full tests plus passing typecheck, workspace validation, build/type generation, and `git diff --check`; lint had zero errors and the same two pre-existing warnings.

## What was actually extracted

- Public version and liveness reads.
- A minimized authenticated business operational summary.
- A minimized authenticated effective capability/entitlement projection.
- Shared v1 contracts, envelopes, request correlation, cache defaults, and
  server-only identity/tenant/capability adapters.

No current application component calls these endpoints. The extraction proves
the boundary and supplies bounded reads for actual future client needs; it does
not replace working Server Component/domain reads merely to force HTTP.

## What remains in the application runtime

Direct Prisma usage remains in server-only code: eight legacy API route files,
22 action files, 31 page/layout files, and three other server files in the
current source inventory. This is not browser-to-database access. Server
Components may continue to use query/domain layers directly under the approved
topology, while Server Actions remain the authoritative write boundary.

Legacy route handlers remain for analytics, health, public card/manifest/icon,
scan/search, and authentication. Public token routes remain the approved narrow
public exception. No legacy route was silently versioned, changed, deprecated,
or represented as externally stable by TC5.

## Sufficiency and later architecture gates

The foundation is sufficient for current consumption because there is no
existing `/api/v1` browser consumer requiring additional reads. A new read
should be added only with a named consumer, minimized DTO, and parity/security
evidence.

Any v1 write requires a separately approved architecture covering CSRF for
cookie-authenticated clients, validation/problem mapping, idempotency,
transactions, capability and tenant enforcement, audit/ledger invariants,
concurrency, and rollback. Critical loyalty writes must preserve the existing
authoritative ledger behavior before any extraction.

An external consumer contract additionally requires an approved authentication
model, scopes, rate limits, pagination/filter conventions, publication and
support policy, privacy review, compatibility tests, typed client or OpenAPI
decision, and the documented deprecation/Sunset process. None is implied here.

## Duplication assessment

`business/summary` and `business/access` are distinct projections: the former
describes operational business/programme state, while the latter describes the
current actor's effective access. Combining them now would couple unrelated
change rates and expose data a consumer may not need.

There is limited implementation duplication: both handlers repeat the same
actor-problem-to-HTTP mapping, no-tenant guard, missing-business 404, and generic
error boundary; both also perform a separate business read. This is acceptable
at two endpoints but should be consolidated only when a third authenticated
business read or a measured consumer request proves the abstraction useful.

The contract package duplicates the canonical capability and product-feature
identifier arrays because it cannot import application runtime modules. Parity
tests currently prevent drift; future contract generation may remove this
maintenance duplication if an external contract is approved.

## Follow-up closure evidence

On 2026-08-13, PRs #92 and #93 closed the unsupported-method cache exception for all four current endpoints. A protected isolated-Staging replay confirmed a shared HTTP 405 v1 problem envelope, `Allow: GET`, `Cache-Control: no-store, max-age=0`, `nosniff`, and no auth/database write path for unsupported methods.

Authenticated runtime UAT then used one disposable synthetic Owner and business on the isolated Neon Staging branch. Both `GET /api/v1/business/summary` and `GET /api/v1/business/access` returned HTTP 200 with `no-store`. Conflicting client query inputs (`tenantId`, `slug`, and `role=SUPER_ADMIN`) did not change the session-derived business or capabilities. The summary remained minimized and exposed no contacts, billing, notes, credentials, or customer records. No Super Admin fixture was created. The synthetic Owner, business, and associated verification/reset records were deleted immediately, and the post-cleanup counts were all zero.

This is bounded technical evidence for the current read foundation only. It is not a real participant Closed Beta, external API publication, Production authorization, or Go-Live approval.

## Defects and hardening follow-ups

1. **Completed — normalize unsupported methods:** PRs #92 and #93 added the shared safe 405 boundary and Staging replay passed.
2. **Completed — authenticated Preview UAT:** both protected reads passed with a disposable Owner session on isolated Staging; conflicting client tenant/slug/role inputs were ignored and cleanup was verified at zero.
3. **Watch handler duplication:** extract the shared authenticated-business
   problem mapper/guard only if another protected read makes repetition material.
4. **Keep contract identifiers synchronized:** retain capability/entitlement
   parity tests until a single generated external-contract source is approved.
5. **Name a consumer before more reads:** do not expand `/api/v1` speculatively;
   current Server Components do not require internal HTTP.

These are recorded follow-ups only. This audit introduces no endpoint, runtime
change, schema, migration, database write, credential, provider, or Production
action.
