# LoyalFlow

LoyalFlow is a bilingual loyalty-operations SaaS for Providers, Business Owners, staff, and customers. The product supports business provisioning, loyalty programmes, customer membership, QR join, earn/redeem operations, rewards, referrals, reporting, managed plans, and Standard/Custom loyalty cards.

## Current project state

- Authoritative working branch: `staging`
- Final Product Z-series: Z1–Z14 complete at source/code/automated-test/CI/merge level
- Current phase: bounded Final Visual / brand-customization preparation
- Commercial model: Provider-assisted V1
- Manual UAT / real-business Closed Beta: deferred until explicitly resumed
- Production deployment or mutation: not authorized by the current phase

The current release-gate checklist is tracked in GitHub issue #206. Real Closed Beta remains separately tracked in issue #103.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- PostgreSQL + Prisma 7
- Tailwind CSS 4 + Base UI / shadcn primitives
- NextAuth credentials authentication
- Node test runner + Playwright release/browser coverage
- pnpm

## Repository structure

- `app/` — Next.js routes, layouts, Server Actions, route handlers, metadata, and public surfaces
- `components/ui/` — reusable semantic UI primitives
- `components/page-layout/` — shared List, Detail, Settings, Analytics, and Operational page layouts
- `components/` — product components and application shell
- `lib/` — web adapters, auth, permissions, entitlements, card rendering, i18n composition, integrations, utilities
- `packages/contracts/` — runtime-neutral product/API contracts
- `packages/domain/` — runtime-neutral domain logic
- `packages/i18n/` — extracted bilingual runtime-neutral messages
- `prisma/` — schema and immutable migration history
- `tests/` — source, domain, safety, regression, and product contract tests
- `docs/` — delivery, release, operational, and product authorities

Workspace boundaries are validated automatically. Runtime-neutral packages may not silently acquire React, Next.js, or Prisma dependencies.

## Local development

Use the repository package manager and current branch:

```bash
git checkout staging
git pull --ff-only
pnpm install --frozen-lockfile
pnpm dev
```

Environment values are managed outside Git. Never commit `.env` files, credentials, tokens, private keys, or service-account material.

## Required validation

For normal source changes, the minimum local validation is:

```bash
pnpm test
pnpm run typecheck
pnpm run validate:workspace
pnpm run lint
pnpm run build
git diff --check
```

Pull requests targeting `staging` also run the repository Staging PR Validation workflow. Database/migration changes have an additional Migration Integrity workflow and remain separately gated.

## Engineering handoff

Before changing product behavior or operating a support case, use these current authorities:

- `DEVELOPER_HANDOFF.md` — product and visual-development boundaries, including the final Custom Card contract.
- `docs/architecture/AUTH_ROLE_AUTHORITY.md` — authentication, tenant, capability and role-aware entry authority.
- `docs/operations/SUPPORT_RUNBOOK.md` — safe support triage, severity and escalation boundaries.
- `docs/FRESH_DEVELOPER_REHEARSAL.md` — clean-runner bootstrap and validation acceptance.
- `docs/CONSOLIDATED_UAT_RUNBOOK.md` — manual/non-production UAT authority.
- `docs/PRODUCTION_DEPLOYMENT.md` and `docs/PRODUCTION_RELEASE_CHECKLIST.md` — Production release boundary.

## UI and Final Visual authority

Application chrome uses semantic `--lf-*` design tokens from `app/globals.css`. Compatibility aliases are centralized in `app/loyalflow-theme-aliases.css`; they are not a second independent theme.

Prefer:

- semantic tokens over page-specific hardcoded palettes;
- `components/ui` primitives over one-off controls;
- `components/page-layout` templates over bespoke page shells;
- responsive/RTL-safe logical properties;
- existing loading, empty, validation, error, success, disabled, and focus patterns.

Do not redesign product behavior while doing visual work.

## Arabic and English

Arabic and English are first-class presentation variants of the same product behavior.

- runtime-neutral messages live under `packages/i18n/src/locales/ar` and `packages/i18n/src/locales/en`;
- web marketing copy is separated under `lib/i18n/locales/ar/marketing.ts` and `lib/i18n/locales/en/marketing.ts`;
- the web catalog composes those sources and preserves the existing `translate()` API;
- Arabic uses RTL and English uses LTR.

When a touched screen still owns local `t(ar, en)` copy, prefer moving that touched copy to the appropriate canonical locale source rather than creating another translation pattern.

## Card product boundaries

LoyalFlow has two card products:

- **Standard Card** — Business Owner managed, system rendered, constrained palettes/themes/artwork, protected geometry.
- **Custom Card** — Provider/Super Admin managed artwork with system-owned dynamic overlays and protected safe zones.

Canonical card geometry, QR placement, member identity, balance/progress/reward zones, and Front/Back rendering safety must not be changed as part of ordinary visual customization.

## Change workflow

Use small bounded slices:

1. branch from current `staging`;
2. change only the approved scope;
3. open a PR to `staging`;
4. wait for full CI;
5. merge with a merge commit only when green.

Do not squash/rebase merge. Do not use dummy commits or environment changes to manufacture a passing gate.

## Safety boundaries

Without explicit Product Owner authorization, do not:

- deploy or mutate Production;
- change schema/migrations;
- change environment variables, credentials, or secrets;
- activate or change payment/provider behavior;
- change tenant isolation, authentication, permissions, entitlements, or loyalty economics;
- invent public prices, plan names, capability matrices, business claims, or legal/analytics policy;
- treat automated evidence as real-business Closed Beta evidence.

For the Final Visual phase, preserve the completed product contracts and change presentation first.
