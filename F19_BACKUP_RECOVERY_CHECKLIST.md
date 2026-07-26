# LoyalFlow Backup & Recovery Checklist

This checklist documents operational expectations. It does not automatically
create, restore, or delete provider backups.

## Before production launch

- Confirm the production database provider has backups or point-in-time
  recovery enabled for the chosen service tier.
- Record the retention window in the private operations documentation.
- Record who is authorised to initiate a restore.
- Confirm a restore can target an isolated recovery database/branch first.
- Keep application deployment rollback separate from database recovery.

## Before a restore

1. Declare the incident and freeze deployment activity.
2. Capture the exact application release SHA.
3. Verify the production database identity.
4. Identify the recovery point and the reason for restore.
5. Prefer restoring into an isolated database/branch for validation.
6. Validate migration history and critical tenant data before cutover.

## After a restore

- Run production database identity verification.
- Run migration status.
- Run production readiness.
- Run health smoke checks.
- Verify authentication.
- Verify tenant isolation.
- Verify one disposable loyalty operation exactly once.
- Verify public card privacy.

## Never use as a recovery shortcut

```text
prisma migrate reset
prisma migrate dev
prisma db push
manual deletion of Prisma migration history
```
