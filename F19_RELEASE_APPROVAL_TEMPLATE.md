# LoyalFlow Production Release Approval

Use one copy per production release. Store completed approval records in the
private operations system; do not add secrets to this file.

## Candidate

- Git SHA:
- Branch/tag:
- Release owner:
- Approval date:
- Production URL:
- Expected production database name:

## Local gate

- [ ] Working tree clean
- [ ] `pnpm run verify:release-checkpoint` PASS
- [ ] `pnpm run release:final` PASS
- [ ] `pnpm run release:final:browser` PASS
- [ ] Release manifest captured

## Production preflight

- [ ] `LOYALFLOW_ENVIRONMENT=production`
- [ ] `LOYALFLOW_RELEASE_SHA` matches approved Git SHA
- [ ] `pnpm run release:production-preflight` PASS
- [ ] `pnpm run verify:production-db` PASS
- [ ] Migration status reviewed

## Database change

- [ ] No production migration required

or

- [ ] Reviewed migration deployment approved
- [ ] `pnpm run db:migrate:deploy` PASS
- [ ] Post-deploy migration status PASS

## Deployment

- [ ] Exact approved Git SHA deployed
- [ ] Previous application deployment retained for rollback
- [ ] `pnpm run verify:production-smoke` PASS
- [ ] `pnpm run verify:operations` not critical
- [ ] Login PASS
- [ ] Super Admin access PASS
- [ ] Disposable tenant workflow PASS
- [ ] Scan exact-once earn/redeem PASS
- [ ] Public enrolment/card privacy PASS

## Final decision

- [ ] APPROVED
- [ ] BLOCKED
- [ ] ROLLED BACK

Notes:
