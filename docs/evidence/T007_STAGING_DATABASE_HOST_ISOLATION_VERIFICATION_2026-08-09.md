# T007 Staging Database Host Isolation Verification

Date: 2026-08-09
Runtime/test/config head: `64e7e90cad53c2d5fbf53da4870762c634e9618f`
GitHub Actions run: `31332068436` (`T007 Verify`, run #3)

## Result

PASS.

The focused CI run completed successfully on the PR merge candidate with:

- dependency install: PASS;
- TypeScript typecheck: PASS;
- ESLint: PASS with 0 errors and the same 2 pre-existing warnings in `app/account/security/actions.ts`;
- unit/contract tests: 799/799 PASS, 0 failures;
- Prisma Client generation: PASS, Prisma 7.9.0;
- Next.js production build: PASS.

## Behavior verified

The staging isolation guard now validates both database name and database host. This is required because the provisioned Neon `staging` branch and Production branch both use the database name `neondb`, while their endpoint hosts are distinct.

Behavioral coverage confirms that staging:

- fails closed if expected staging database identity is missing;
- fails closed if expected staging database host is missing;
- rejects the Production database host even when staging and Production database names are identical;
- accepts only the explicitly expected staging database host;
- rejects unexpected database hosts;
- rejects malformed `DATABASE_URL` values;
- preserves the non-staging behavior boundary.

## Safety

No Production deployment, Production DB mutation, migration, seed, reset, backfill, dependency change, lockfile change, Vercel environment-variable mutation, or beta participant enrollment was performed by this verification.

The CI-only `DATABASE_URL` and `AUTH_SECRET` values are synthetic local build placeholders and are not runtime credentials.
