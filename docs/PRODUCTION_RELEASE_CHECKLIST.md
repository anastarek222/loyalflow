# LoyalFlow production release checklist

This is an operator checklist for a reviewed release commit. It records gates
and responsibilities; it does not authorize a deployment, create a backup, or
apply a migration.

## A. Automated gates completed locally

Record the exact commit and result for each gate before approval:

- [ ] `npm run verify:local-db` (isolated `loyalflow_test` only)
- [ ] `npx prisma validate`
- [ ] `npx prisma migrate status` (against the explicitly verified target)
- [ ] `npm run verify:local-branch-staff`
- [ ] `npm run verify:local-staff-permissions`
- [ ] `npm run test:financial-integrity`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:browser-uat` using disposable, non-production fixtures
- [ ] `NEXT_PUBLIC_APP_URL=https://uat.example.invalid npm run build`
- [ ] `npm audit --omit=dev --audit-level=high` (record remaining findings)
- [ ] `git diff --check`

Do not run fixture preparation, browser UAT, or any local verifier against a
production database. UAT credentials, fixture passwords, and manifests are
test-only and must not be configured in production.

## B. Production operator checks still required

- [ ] Confirm the release commit and production deployment target.
- [ ] Confirm required variable *names* are present (`DATABASE_URL`,
  `AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL`), without printing values. Confirm
  the public URL is the canonical HTTPS origin and that no secret uses a
  `NEXT_PUBLIC_` name.
- [ ] Confirm the intended database identity and that `SHADOW_DATABASE_URL` is
  not a production dependency.
- [ ] Review `prisma migrate status` for failed, missing, or unexpected
  migrations. The committed migration history is immutable; do not edit it or
  use `migrate dev`, `db push`, or `migrate reset` in production.
- [ ] Confirm platform-level rate limiting, TLS, and deployment log access are
  configured for the intended exposure.

## C. Backup and recovery checkpoint

The database provider owns backup retention, point-in-time recovery (PITR),
and restore-point availability. Before a migration or other high-risk change,
the release owner must verify the provider's current backup/PITR capability,
create or confirm the approved pre-release restore point/branch when available,
and record its identifier outside source control. This repository does not
verify or claim that a backup exists.

Record the incident owner, database restore decision owner, RPO/RTO, and the
last successful restore-verification drill. A restore is not complete until it
is performed into an isolated target and the operator verifies migration state,
tenant isolation, and loyalty ledger/customer-balance reconciliation. Never
point a restore drill or a local verifier at production.

Prefer a reviewed forward-fix migration for rollback when data has been
written. Restore from the approved provider checkpoint only with an explicit
incident decision that accepts the data-loss boundary. Stop rollout and assign
an incident owner for: failed migration, migration drift, readiness failure,
cross-tenant exposure, financial reconciliation mismatch, authentication or
authorization regression, or a high-severity production vulnerability.

## D. Deployment steps

1. Reconfirm the backup/recovery checkpoint and owners.
2. In the controlled production job, run `npm run db:generate`, `npm run
   db:validate`, and `npm run db:migrate:status` against the verified target.
3. Apply reviewed pending migrations exactly once with `npm run
   db:migrate:deploy` only when the operator approves the migration decision.
4. Build and deploy the reviewed release commit. Do not use development
   fixtures, `migrate dev`, or `db push`.

## E. Post-deployment smoke checks

- [ ] `GET /api/health/live` returns HTTP 200.
- [ ] `GET /api/health` returns HTTP 200 and no database internals.
- [ ] Use non-production test accounts to verify login, dashboard, customer
  lookup, one earn, one redeem, and one public card.
- [ ] Verify a cross-tenant route and an inactive account are rejected.
- [ ] Verify response security headers, safe error responses, and redacted
  logs on the deployed HTTPS origin.
- [ ] Reconcile the smoke-test customer balance with its ledger entries before
  declaring the release healthy.
