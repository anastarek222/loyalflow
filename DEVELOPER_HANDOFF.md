# LoyalFlow Developer Handoff

## Authoritative version

- Repository: `https://github.com/anastarek222/loyalflow.git`
- Branch: `feature/product-architecture-v1`
- Handoff commit before this document: `d7d7f5d`
- Production: `https://loyalflow-gray.vercel.app`
- Hosting project: `anas-tarek/loyalflow`

## Current project status

The application architecture, backend foundation, database integration, authentication, authorization, business scoping, public loyalty cards, scanning flows, onboarding, reporting, and release safeguards are implemented.

The project is ready for frontend refinement and limited backend adjustments.

## Verified checks

- Browser UAT: 7/7 tests passed
- ESLint passed
- TypeScript typecheck passed
- Production deployment responds successfully
- Git working tree was clean before handoff
- The historical ZIP containing sensitive files was removed from active GitHub history

## Main developer scope

The developer should primarily work on:

- Frontend design and visual consistency
- Responsive layouts
- Arabic and English presentation
- Accessibility and interaction polish
- Loading, empty, validation, and error states
- Small backend adjustments required by approved frontend work
- Additional automated tests for changed behavior

## Architecture constraints

Preserve:

- Tenant isolation by business
- Role and capability authorization
- Existing authentication flow
- Prisma schema and migration history
- Loyalty calculation rules
- Scan earn/redeem exact-once safeguards
- Public-card privacy rules
- Arabic and English support
- Production release gates

## Production safety rules

Do not perform any of the following without owner approval:

- Reset, seed, truncate, or delete production data
- Run experimental migrations against production
- Change production environment variables
- Replace production database connections
- Disable authorization or tenant checks
- Force-push or rewrite Git history
- Commit `.env` files, tokens, credentials, private keys, or service-account JSON files
- Expose private customer notes or internal business data on public routes

All database migrations must be:

1. Reviewed
2. Tested outside production
3. Backward-compatible when possible
4. Applied using the documented deployment process

## Environment and secrets

Environment values are managed outside Git.

Important production variables include:

- `DATABASE_URL`
- `AUTH_SECRET`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_TRUST_HOST`
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `LOYALFLOW_ENVIRONMENT`
- `LOYALFLOW_PRODUCTION_DATABASE`
- `LOYALFLOW_RELEASE_SHA`

## Security work completed

- `AUTH_SECRET` was rotated
- `JWT_SECRET` was rotated
- A new Google service-account key was added to production
- The application was redeployed successfully
- The exposed ZIP was removed from active remote Git history

## Known unverified item

Google Sheets synchronization was not manually tested after the latest service-account key rotation.

The previous Google service-account key should remain temporarily until the new key is confirmed operational.

## Database credential note

Database credentials were not rotated during handoff preparation to avoid disrupting production.

Credential rotation should be handled later as planned maintenance with connection verification and rollback preparation.

## Required workflow for developer changes

Before starting:

    git checkout feature/product-architecture-v1
    git pull --ff-only
    pnpm install

Before submitting changes:

    pnpm lint
    pnpm typecheck
    pnpm test
    git diff --check

Run relevant Playwright browser tests for any modified user journey.

## Delivery expectations

Each pull request should include:

- What changed
- Why it changed
- Screenshots for frontend changes
- Routes and roles affected
- Database impact
- Tests executed
- Known limitations
- Rollback considerations
