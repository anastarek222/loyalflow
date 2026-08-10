# T007 Staging Runtime Proof

Status: `PENDING`

## Candidate

- Release SHA: `<sha>`
- Staging host: `<host>`
- Operator: `<name/role>`
- Date/time: `<timestamp>`

## Runtime identity

- `/api/health` HTTP status: `<status>`
- `environment`: `<expected staging>`
- `release`: `<bounded public release value>`
- `status`: `<expected ready>`

Do not paste secrets, database URLs, tokens, cookies, or private headers into this record.

## Database isolation

- Staging database identity matched approved staging target: `<yes/no>`
- Staging database identity differed from Production: `<yes/no>`
- Credentials recorded in evidence: `no`

## Quality gates

- Typecheck: `<pass/fail>`
- Lint: `<pass/fail>`
- Unit/contract tests: `<pass/fail + count>`
- Production build: `<pass/fail>`
- Desktop/mobile E2E matrix: `<pass/fail + journeys>`

## Performance

- Sample count: `<n>`
- p95: `<ms>`
- Error rate: `<rate>`
- Budget result: `<pass/fail>`

## Rollback readiness

- Rollback/provider recovery check performed: `<yes/no>`
- Result: `<pass/fail>`
- Production mutation performed: `no`

## Accepted issues

List only issue IDs and bounded summaries required to explain skipped or accepted staging gates. Do not include secrets or unnecessary participant/customer data.

- `<issue-id>` — `<summary>`

## Decision

`PENDING — STAGING ACTIVATION NOT YET PROVEN`

This template must not be changed to PASS/READY until the provider-side staging environment has actually been activated and the evidence above has been observed for the stated release SHA.
