# LoyalFlow Authentication and Role Authority

Status: current source-aligned handoff for the provider-assisted V1 application. This document describes existing behavior; it does not grant new permissions or replace server-side authorization.

## Authentication boundary

- Credentials authentication is server-owned.
- Inactive users are refused.
- A user attached to an inactive business is refused.
- Email verification must be satisfied before login completes.
- Super Admin requires the Super Admin MFA path. If MFA is not enrolled, login returns the MFA setup state rather than silently bypassing the requirement.
- Role routing happens only after authentication; a route destination does not itself grant access.

The implementation authority remains the authentication runtime and server permission checks. UI visibility is never sufficient authorization.

## Roles

The current application roles are:

- `SUPER_ADMIN`
- `OWNER`
- `MANAGER`
- `STAFF`
- `VIEWER`

Non-Super-Admin users are tenant-bound. Their `businessId` must match the target business for a capability check to succeed.

## Capability matrix

| Capability | Super Admin | Owner | Manager | Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Customers view | Global | Own business | Own business | Own business | Own business |
| Customers edit | Global | Own business | Own business | No | No |
| Loyalty earn | Global | Own business | Own business | Own business | No |
| Loyalty redeem | Global | Own business | Own business | Own business | No |
| Loyalty adjust | Global | Own business | Own business | No | No |
| Reports view | Global | Own business | Own business | No | Own business |
| Staff manage | Global | Own business | No | No | No |
| Settings edit | Global | Own business | No | No | No |

`SUPER_ADMIN` is treated as global by the capability helper. This does not remove separate product, plan, confirmation, or environment guards on particular actions.

## Role-aware entry routing

For an active assigned business:

- `OWNER` → business workspace root.
- `MANAGER` → business workspace root.
- `VIEWER` → business workspace root.
- `STAFF` → `/businesses/[slug]/scan` when the user has the Scan/earn capability; otherwise the business workspace root.
- `SUPER_ADMIN` → global dashboard/administration experience rather than direct tenant routing.

If the assigned business is unavailable/inactive, the role-aware direct-entry helper does not manufacture a tenant destination.

A pending Owner onboarding state still routes to `/onboarding` before normal Owner workspace use.

## Tenant rule

For every non-Super-Admin capability check:

1. resolve the target business;
2. require the authenticated user to belong to that same business;
3. then evaluate the role capability.

A matching role in another business is not sufficient. Do not add a UI shortcut, direct route, API path, or support procedure that bypasses this ordering.

## Super Admin boundary

Super Admin is a platform role, not a Business Owner surrogate. It can pass the central capability helper globally, but Super Admin-specific administration, MFA, plan, Custom Card, confirmation, and environment rules remain separately enforced where implemented.

Custom Card artwork authority remains Provider/Super Admin managed and plan-gated. Business Owner does not gain Custom Card artwork mutation authority through the generic Owner capability set.

## Support and debugging rule

Do not change a user's role, business assignment, account state, or MFA state merely to make a failing screen work. First determine whether the denial is expected by this matrix and then reproduce with the correct authorized fixture/account.

Any suspected cross-tenant read/write is a security incident, not a normal support workaround.

## Source references

Current code authority:

- `lib/permissions.ts` — canonical capability matrix and tenant matching.
- `lib/dashboard/role-aware-entry.ts` — direct role-aware entry destination.
- `app/login/actions.ts` — primary credential, account/business state, email verification, and Super Admin MFA step behavior.
- `app/dashboard/page.tsx` — authenticated dashboard flow and pending Owner onboarding redirect.

If this document and source disagree, source behavior must be investigated before editing either one. Do not silently “correct” the code from this document or the document from an old architecture snapshot.
