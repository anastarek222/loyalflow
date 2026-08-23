# LoyalFlow Developer Handoff

## Authoritative working state

- Repository: `anastarek222/loyalflow`
- Working/integration branch: `staging`
- Final Product Z1–Z14: complete at source/code/automated-test/CI/merge level
- Current authorized phase: Final Visual / brand-customization preparation and bounded visual implementation
- Current commercial model: Provider-assisted V1
- Release-gate authority: GitHub issue #206
- Real Closed Beta authority: GitHub issue #103

Do not infer Production or GA approval from source completion.

## What is already implemented

The repository already contains the product foundations needed for Final Visual work, including:

- authentication, email verification, Super Admin MFA, session invalidation and rate limiting;
- business/tenant isolation and role/capability permissions;
- Provider provisioning and Business Owner onboarding;
- loyalty programme configuration and visits/points/sales-amount modes;
- customer membership, QR join, earn/redeem operations, rewards and Referral Lite;
- dashboard, operations, reports, staff/team, settings and managed plan/provider surfaces;
- Standard Card constrained customization;
- Provider-managed Custom Card artwork with protected dynamic overlays;
- canonical card Front/Back geometry and flip rendering;
- Arabic RTL and English LTR support;
- reusable UI primitives and page-layout templates;
- migration integrity, workspace-boundary validation and Staging PR CI;
- public marketing SEO plumbing for the currently approved indexable surfaces.

## Current developer scope

Final Visual work may improve:

- brand presentation once approved assets/values are supplied;
- marketing layout and content presentation;
- application shell, navigation and page hierarchy;
- responsive layouts;
- Arabic/English presentation;
- accessibility and interaction polish;
- buttons, cards, inputs, tables, badges and feedback states;
- loading, empty, validation, error, success and disabled states;
- consistency of touched screens with semantic design-system primitives;
- touched-screen i18n source organization where behavior is unchanged.

Prefer presentation-only changes. A visual request is not authorization for backend/product expansion.

## Product boundaries to preserve

Do not change as ordinary visual work:

- tenant isolation;
- role/capability permissions;
- authentication/MFA/email-verification/session rules;
- entitlement and subscription-state enforcement;
- loyalty economic calculations;
- earn/redeem idempotency and duplicate protection;
- public-card privacy boundaries;
- Provider versus Business Owner authority;
- canonical Standard/Custom Card geometry and protected safe zones;
- current Provider-assisted commercial model.

## Design-system authority

- `app/globals.css` owns canonical `--lf-*` application tokens.
- `app/loyalflow-theme-aliases.css` maps compatibility names to the canonical tokens.
- `components/ui/` owns reusable controls and primitives.
- `components/page-layout/` owns shared page structures.

Do not create a new independent palette or page-specific component system during Final Visual work.

## i18n authority

- runtime-neutral locale ownership: `packages/i18n/src/locales/ar` and `packages/i18n/src/locales/en`;
- marketing locale ownership: `lib/i18n/locales/ar/marketing.ts` and `lib/i18n/locales/en/marketing.ts`;
- web composition: `lib/i18n/catalog.ts`;
- Arabic and English must remain equivalent presentations of the same product behavior.

## Card authority

### Standard Card

Business Owner managed and intentionally constrained. Current controls are approved palette/theme/artwork choices; protected functional geometry remains system-owned.

### Custom Card

Provider/Super Admin artwork authority. Front artwork is required for Custom mode; Back artwork may be supplied or safely generated. Dynamic customer/loyalty data remains system-overlaid in protected zones.

Do not add freeform QR movement, arbitrary safe-zone movement, drag/drop card geometry, or Owner-managed Custom Card artwork as visual polish.

## Required development workflow

Start from Staging:

```bash
git checkout staging
git pull --ff-only
pnpm install --frozen-lockfile
```

Before merge, validate:

```bash
pnpm test
pnpm run typecheck
pnpm run validate:workspace
pnpm run lint
pnpm run build
git diff --check
```

Delivery workflow:

1. create a small branch from current `staging`;
2. make one bounded change;
3. open a PR targeting `staging`;
4. wait for full Staging PR Validation;
5. merge with a merge commit only when green.

No squash/rebase merge. No dummy commits to force runtime or CI state.

## Production and data safety

The current phase does not authorize:

- Production deployment or data mutation;
- resets, seeds, truncation or destructive data commands;
- schema/migration changes;
- production/environment variable changes;
- credential or secret changes;
- payment/provider activation;
- force-push or history rewriting;
- committing `.env`, tokens, credentials, private keys or service-account material.

Database or infrastructure work must be a separately approved slice with its own gate.

## Human/runtime gates still separate

The following are not completed by Final Visual source work:

- exact-current-SHA human/runtime acceptance when resumed;
- 5–10 real-business Closed Beta;
- Product Owner GO / CONDITIONAL GO / NO-GO;
- final commercial/legal/analytics decisions;
- Production readiness and explicit launch authorization.

## Product Owner inputs intentionally left for later

Autonomous preparation must not invent:

- final logo/brand assets;
- final brand colors or typography choices;
- public plan names, prices or final capability matrix;
- About/company claims or customer/social-proof claims;
- final legal/analytics policy;
- payment-provider/checkout decision;
- final social/OG creative;
- final Production launch decision.

See `docs/FINAL_VISUAL_OWNER_INPUTS.md` for the concise owner-input checklist.
