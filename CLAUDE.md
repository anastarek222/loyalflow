# LoyalFlow coding-agent guidance

This file is repository guidance for coding agents. The current repository and `staging` branch are the source of truth; do not rely on older handoff assumptions.

## Read before changing code

1. Read `AGENTS.md`.
2. Because this repository uses a current Next.js release with breaking changes, read the relevant guide in `node_modules/next/dist/docs/` before changing Next.js APIs or conventions.
3. Read `docs/FINAL_PRODUCT_Z_PLAN.md` for completed product boundaries.
4. Read GitHub issue #206 for the current release-gate state when release status matters.

## Current state

- Working branch authority: `staging`.
- Final Product Z1–Z14 is complete at source/code/automated-test/CI/merge level.
- Current authorized work is bounded Final Visual / brand-customization preparation and later visual implementation.
- This phase is not Z15.
- Manual UAT and real-business Closed Beta remain deferred until explicitly resumed.
- Production is not authorized by the current phase.

## Current stack

- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL + Prisma 7
- Tailwind CSS 4
- Base UI / shadcn-compatible primitives
- NextAuth credentials authentication
- pnpm
- Node test runner plus Playwright release/browser coverage

Use the scripts in `package.json`; do not substitute stale npm commands from old documentation.

## Required workflow

Start from current Staging:

```bash
git checkout staging
git pull --ff-only
pnpm install --frozen-lockfile
```

Normal validation before merge:

```bash
pnpm test
pnpm run typecheck
pnpm run validate:workspace
pnpm run lint
pnpm run build
git diff --check
```

Then PR to `staging` and merge only after full CI is green. Merge commit only; do not squash or rebase merge.

## Architecture boundaries

Preserve these authorities:

- `packages/contracts` — runtime-neutral contracts.
- `packages/domain` — runtime-neutral domain rules.
- `packages/i18n` — runtime-neutral message ownership.
- `lib/` — web/runtime adapters and product authorities.
- `components/ui` — reusable semantic UI primitives.
- `components/page-layout` — shared page structures.
- `prisma/schema.prisma` + immutable migration history — database authority.

The workspace validator deliberately prevents runtime-neutral packages from silently depending on React, Next.js, Prisma, or unapproved internal packages.

## Final Visual rules

Visual work should preferentially change presentation rather than product behavior.

Use:

- semantic `--lf-*` tokens in `app/globals.css`;
- compatibility aliases in `app/loyalflow-theme-aliases.css` only as aliases, not as a second palette;
- shared `components/ui` controls;
- shared page-layout templates;
- logical RTL/LTR-safe spacing and alignment;
- existing responsive and accessibility patterns.

Avoid page-specific CSS hacks or new independent color authorities when a semantic token or primitive already exists.

## i18n rules

Arabic and English are presentation variants of the same persisted product state.

- extracted runtime-neutral locale files are under `packages/i18n/src/locales/ar` and `packages/i18n/src/locales/en`;
- marketing copy is separated under `lib/i18n/locales/ar/marketing.ts` and `lib/i18n/locales/en/marketing.ts`;
- `lib/i18n/catalog.ts` composes canonical sources;
- preserve AR/EN key parity and RTL/LTR behavior.

If a screen touched for Final Visual still owns local bilingual literals, migrate only the touched copy to the appropriate canonical source when safe. Do not create a third translation system.

## Card rules

Do not treat card rendering as ordinary freeform design.

- Standard Card is constrained and Business Owner managed.
- Custom Card artwork is Provider/Super Admin managed.
- Canonical canvas, QR geometry, customer identity, balance/progress/reward safe zones, Front/Back rendering, and flip behavior are protected product contracts.
- Do not introduce free QR movement, drag/drop geometry, arbitrary font sizing, or Owner-managed Custom Card artwork as visual polish.

## Security and data rules

Preserve:

- tenant isolation;
- role/capability authorization;
- authentication, email verification, MFA, rate limiting, and session invalidation behavior;
- entitlements and subscription-state enforcement;
- exact-once/idempotency safeguards for loyalty operations;
- public-card privacy boundaries;
- Prisma schema and migration history unless a separately approved database slice explicitly changes them.

Never commit secrets or credentials.

## Separately gated work

Do not perform without explicit Product Owner authorization:

- Production deployment or Production mutation;
- schema/migration changes;
- environment, credential, or secret changes;
- provider/payment activation or behavior changes;
- loyalty economics, permissions, tenant/auth behavior changes;
- public pricing/plan-name/capability decisions;
- legal or analytics policy decisions;
- Manual UAT or real-business Closed Beta claims.

When a request is purely visual, do not expand it into backend cleanup.
