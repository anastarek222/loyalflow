# Final Product F1 — Primitive States and Surface Hierarchy

Status: `IMPLEMENTATION_CANDIDATE`

Depends on: F0 Design System Foundation.

## Scope

F1 tightens shared UI primitives before shell/page rollout:

- primary Button default/hover/active states use canonical LoyalFlow semantic tokens;
- Brand Badge uses the existing canonical soft-primary token instead of an undeclared presentation class;
- Card uses the product surface radius rather than the tighter form-control radius;
- existing loading, disabled, focus, AR/EN, RTL/LTR, and accessibility behavior remains unchanged;
- focused source-contract tests lock these primitive decisions.

## Non-goals

No page redesign, navigation change, business logic, backend/auth/tenant change, schema/migration, environment/provider/credential/secret change, payment/legal activation, real participant data, or Production action.

## Exit

Pass focused/full tests, TypeScript, workspace validation, ESLint, Next.js build, and whitespace validation in a reviewable PR to `staging`.

## Next

F2 applies the shared system to the application shell: sidebar, topbar, navigation density, active/hover states, responsive behavior, and consistent business/account controls without changing navigation permissions or route semantics.
