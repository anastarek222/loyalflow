# Local Database Verification

Run this only from a terminal connected to the explicitly non-production
`loyalflow_test` database. It never runs `prisma migrate reset`, truncates no
tables, and deletes only the fixture businesses it created in that invocation.

## Prior source-verified milestones

The current source tree contains Phase I source-only migrations
(`20260720190000_add_loyalty_promotions` and
`20260720200000_add_earn_idempotency_and_promotion_multiplier`). Before they
are approved and applied, the reviewed Phase 0–H database state is exactly the
first 13 migrations.

Run:

```sh
npx prisma migrate status
npm run verify:local-db
```

Expected results:

- `migrate status` identifies `loyalflow_test`. It may report the Phase I
  promotion migration as pending; do not apply it as part of this verification.
- `verify:local-db` ends with `PASS: loyalflow_test migration history and
  isolated database verification completed.`
- The script aborts before creating anything unless `SELECT current_database()`
  returns exactly `loyalflow_test` and the reviewed pre-activation migration
  history contains either the original 13 migrations or those 13 plus the
  promotion-foundation migration.
- Its interactive write callbacks use script-only `maxWait: 30000` and
  `timeout: 15000` options. They remain short, run one at a time, and do not
  change application-wide Prisma transaction behavior.
- It creates businesses whose slugs begin `lf-verify-`, with related customers,
  rewards, activities, transactions, and redemptions. In `finally`, it deletes
  only those known business IDs; normal tenant data is never queried for cleanup.

The script verifies, using isolated records:

- migration history and test-database identity;
- direct customer creation and the QR self-signup data path (validation,
  generated customer code, public token, and `CUSTOMER_CREATED` activity);
- tenant-scoped earn protection; VISITS, POINTS, and SALES_AMOUNT earning;
  immutable sales provenance; and manual adjustment;
- reward create/edit/activation/deactivation, selected-reward redemption,
  active-only reward selection, and legacy single-reward fallback;
- customer timeline composition, at-risk segmentation query behavior, and a
  bounded retention score.

It does not replace browser UAT or server-action authentication checks. Record
the terminal output and the resulting exit code in the execution checklist.

## Browser UAT still required

After the database script passes, use a non-production owner and staff account
to verify the public `/join/[slug]` flow, QR resolution, tenant boundary
redirects, reward management screens, selected reward redemption, reports, and
the Phase H impact disclaimer. Do not use an existing customer record; create a
fresh `lf-uat-*` business and remove only that business after sign-off.

## Phase I promotion migration

The promotion migrations are additive: the first creates `Promotion` and
`PromotionApplication` tables plus indexes and foreign keys; the second adds
nullable idempotency/multiplier/audit columns and a tenant-scoped unique
idempotency index. They do not alter or rewrite existing customer, reward,
redemption, or loyalty-transaction rows. They are intentionally not applied by
the commands above.

When Phase I is approved for the test database, first review the SQL and confirm
the current database identity, then run:

```sh
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Success requires the final status to report an up-to-date schema. Do not run
these commands against a production database, and do not use `migrate reset`.

After the migration succeeds, run:

```sh
npm run verify:local-promotions
```

Expected output is `PASS: loyalflow_test promotion migration and isolated
promotion verification completed.` This second self-cleaning verifier checks
tenant-scoped eligibility, deterministic promotion selection, bonus crediting,
and the unique transaction-to-promotion audit relation. It must pass before
promotion earning is activated in the application.
