# Final Product F2 — Shell Semantic Polish

Status: `IMPLEMENTATION_CANDIDATE`

Depends on: F0 Design System Foundation and F1 Primitive States.

## Scope

F2 applies the shared semantic theme to the desktop application shell without changing navigation behavior:

- Topbar business switcher, notification control, Scan action, and account identity use canonical surfaces and foregrounds.
- Sidebar brand/context panels use canonical primary-soft and foreground tokens.
- direct white and undeclared `primary-subtle` shell presentation classes are removed.
- shared LoyalFlow radius tokens replace ad-hoc shell radii on touched controls.
- existing business switching, route construction, capability filtering, active-route matching, Escape handling, focus return, AR/EN, and RTL/LTR behavior remain unchanged.

## Explicit non-goals

No route, role, entitlement, navigation information architecture, mobile drawer behavior, backend/auth/tenant logic, schema/migration, environment/provider/credential/secret, payment/legal activation, participant data, or Production change.

## Exit evidence

- focused shell semantic contract passes;
- full test suite passes;
- TypeScript, workspace validation, ESLint, Next.js build, and whitespace validation pass;
- reviewable PR merges to `staging` with a merge commit.

## Next

F3 begins page-level Final Product rollout, starting with high-frequency operational surfaces and preserving their existing server/data authorities.
