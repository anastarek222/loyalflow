# T007 Staging Activation Checklist

Date: 2026-08-09

## Purpose

This checklist defines the exact provider-side and runtime evidence required to activate a named isolated staging environment for T007. It does not itself change Vercel, Neon, environment variables, secrets, or databases.

## Preconditions

- Candidate code is on a reviewed branch or merged `main` commit with recorded repository-local verification.
- The application staging contract from T007 is present and fail-closed.
- A distinct non-production database target exists or will be provisioned with explicit approval.
- Production database identity is known to the operator without copying secrets into documentation.
- Rollback owner and incident contact are known for the staging activation window.

## Provider configuration required

The named staging deployment must be configured with values equivalent to:

- `LOYALFLOW_ENVIRONMENT=staging`
- `DATABASE_URL=<staging-only database connection>`
- `LOYALFLOW_STAGING_DATABASE=<exact staging database name>`
- `LOYALFLOW_PRODUCTION_DATABASE=<exact Production database name used only for collision refusal>`
- canonical app URL/release metadata values appropriate for the staging host

Secrets and raw connection strings must never be committed or pasted into evidence files.

## Isolation requirements

Before staging can be treated as active:

- staging must not share the Production database;
- the connected database name must exactly match `LOYALFLOW_STAGING_DATABASE`;
- the expected staging database name must not equal `LOYALFLOW_PRODUCTION_DATABASE`;
- the deployment must identify itself as `staging` at runtime;
- a generic Preview deployment without this explicit identity is not accepted as staging;
- `/api/health` must fail closed if any identity or database boundary is wrong.

## Activation sequence

1. Record the exact candidate release SHA.
2. Provision or select the approved non-production database boundary.
3. Apply the staging-only provider configuration.
4. Deploy the candidate to the named staging environment.
5. Call `/api/health` and verify HTTP 200 with `status: "ready"` and `environment: "staging"`.
6. Record the staging host and release SHA returned by the public health metadata.
7. Run repository-local quality gates for the same candidate SHA if not already recorded.
8. Run the required desktop/mobile E2E matrix against staging.
9. Run the bounded staging performance probe and record sample count, p95, error rate, and pass/fail.
10. Run a safe rollback rehearsal or provider rollback check without mutating Production.
11. Only after all above gates pass may the Closed Beta entry gate be considered satisfied.

## Runtime proof required

The staging activation evidence must contain:

- exact release SHA;
- staging host;
- provider environment name/identity;
- safe confirmation that the database identity matched the approved staging database and differed from Production, without recording credentials;
- `/api/health` HTTP status and bounded public response fields;
- E2E journey counts and any accepted issue IDs;
- performance sample count, p95, error rate, and result;
- rollback rehearsal/check result;
- operator/date/time;
- explicit statement that Production was not mutated.

## Stop conditions

Stop activation and mark T007 blocked if:

- `/api/health` returns 503;
- runtime identity is not `staging`;
- database identity is missing, mismatched, or equal to Production;
- staging host cannot be distinguished from an ordinary transient Preview;
- required E2E or performance evidence fails without an accepted beta issue path;
- provider/build limits prevent repeatable staging deployment.

## Approval boundary

Executing provider configuration, creating/changing databases, changing environment variables/secrets, or deploying an intentionally named staging environment is a separate approval-gated action. This checklist is documentation only and grants no such permission.
