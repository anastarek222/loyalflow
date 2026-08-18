# Final Product F0 — Design System Foundation

Status: `IMPLEMENTATION_CANDIDATE`

Baseline: `staging` after Beta closeout.

## Purpose

F0 starts the Final Product / Frontend phase without reopening Core Beta engineering. The goal is to establish one visual token authority before page-by-page interface work.

## Scope

- Keep the existing canonical LoyalFlow `--lf-*` application tokens as the source of truth.
- Map Base/shadcn compatibility tokens onto those canonical tokens instead of maintaining an independent default grayscale palette.
- Define the shared input/control radius consumed by existing UI primitives.
- Preserve business-specific public-card colors behind the existing `.lf-business-context` boundary.
- Preserve current light-mode, AR/EN, RTL/LTR, accessibility, tenant, auth, data, and runtime behavior.

## Why this comes first

The repository already contains semantic LoyalFlow colors, surfaces, borders, typography, spacing, radii, shadows, motion, focus, chart, and shell tokens. UI primitives such as Button consume compatibility names like `primary`, `background`, `muted`, and `border`. F0 makes those names aliases of the LoyalFlow source instead of allowing a second visual system to drift from the product theme.

## Explicit non-goals

This slice does not redesign individual pages, change card artwork, alter navigation information architecture, add dark mode, change business/public-card palettes, modify application behavior, change schema/migrations, touch environment/provider/credentials, or authorize Production.

## Exit evidence

- focused token-contract test passes;
- full repository tests pass;
- TypeScript, workspace validation, ESLint, Next.js build, and whitespace checks pass;
- reviewable PR into `staging`;
- runtime visual certification remains separate from source/CI certification while the current Vercel deployment quota is blocked.

## Next phase

After F0 merges, F1 can standardize primitive states, density, typography, surfaces, form controls, badges, feedback, tables, and accessibility behavior before shell/page rollout.
