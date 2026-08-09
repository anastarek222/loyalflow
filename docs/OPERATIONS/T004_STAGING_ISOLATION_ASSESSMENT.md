# T004 Staging Isolation Assessment

Date: 2026-08-09
Assessment type: Repository-only, read-only

## What the repository proves

`lib/server/environment-identity.ts` models `staging` as a distinct environment and deployment type and keeps it separate from `production`. The repository also contains production-target guards and release/readiness scripts that reason about environment identity before controlled operations.

## What the repository does not prove

Repository code alone does not prove that an actual staging deployment currently exists or that its hosting configuration, database, credentials, and data-access boundaries are isolated from production.

In particular, this assessment found no provider-side evidence that:

- a deployed staging environment exists;
- staging uses a distinct non-production database;
- staging secrets/configuration are separated from production secrets;
- staging cannot access production customer data;
- a staging-specific release has passed the required smoke/readiness checks.

## T004 conclusion

Status: `CODE_FOUNDATION_PRESENT / DEPLOYED_ISOLATION_UNVERIFIED`

Do not mark staging isolation complete from repository structure alone. Closing this gap requires separately authorised read-only provider/environment verification or separately authorised staging configuration work. No hosting, environment, secret, database, or deployment mutation was performed for this assessment.
