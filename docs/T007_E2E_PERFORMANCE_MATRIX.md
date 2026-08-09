# T007 E2E and Performance Matrix

## Scope

This slice defines the repeatable non-production evidence required before LoyalFlow can claim the T007 staging quality gate. It does not create a staging environment, mutate provider configuration, create test businesses, or run production work.

## E2E matrix

| Journey | Desktop | Tablet | Mobile | Required evidence |
|---|---:|---:|---:|---|
| Public marketing → Get Started | Required | Optional | Required | Playwright pass |
| Existing account → Login | Required | Optional | Required | Playwright pass |
| Owner invitation acceptance | Required | Optional | Required | Playwright pass with disposable beta fixture |
| Owner onboarding | Required | Optional | Required | Playwright pass with disposable beta fixture |
| Owner dashboard core navigation | Required | Optional | Required | Playwright pass |
| Staff Scan/search workflow | Required | Optional | Required | Playwright pass with same-tenant fixture |
| Customer public card | Required | Optional | Required | Playwright pass |
| Cross-tenant authorization rejection | Required | Optional | Required | behavioral E2E rejection evidence |

Existing browser coverage can be reused where it proves the same journey; the gate does not require duplicate tests solely to satisfy this matrix.

## Performance gate

The first bounded staging performance check is the public dependency-aware `/api/health` endpoint. It is intentionally read-only and must run against the isolated staging URL only.

Budget:

- 20 samples minimum per recorded run.
- p95 response time <= 1500 ms.
- HTTP error rate <= 2%.
- malformed or missing samples do not count as evidence.
- failing or undersampled runs fail closed.

The repository implements the deterministic budget evaluator in `lib/uat/performance-budget.ts` and the read-only HTTPS probe in `scripts/verify-staging-performance.ts`.

Example execution after an isolated staging URL exists:

```bash
STAGING_UAT_BASE_URL=https://<isolated-staging-host> pnpm exec tsx scripts/verify-staging-performance.ts
```

Do not record a performance pass from localhost, Production, or an unisolated generic Preview deployment.

## Gate record

To close this T007 sub-gate, evidence must identify:

- exact commit SHA;
- staging environment identity;
- isolated staging host;
- E2E journeys executed and pass/fail count;
- performance sample count, p95, and error rate;
- any skipped journey and explicit reason;
- issue IDs for failures that are accepted into the Closed Beta issue log.

## Non-goals

- No load/stress testing that can materially affect Production or shared customer infrastructure.
- No database migrations, seeds, resets, or backfills.
- No provider or environment-variable mutation.
- No claim that T007 or Closed Beta is complete from this foundation alone.
