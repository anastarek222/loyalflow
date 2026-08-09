# T007 E2E and Performance Matrix Verification

Status: verification pending executable gate evidence.

Runtime/test/config head: `5faaeb9be7367fd2add1febd301e36c8cf02fc7e`.

Static review before executable verification found and fixed two material issues:

- the p95 rejection test originally used only one slow sample out of twenty, which does not exceed the nearest-rank p95; the fixture now uses two slow samples so the asserted p95 failure is real;
- the staging performance probe originally accepted any HTTPS host; it now performs a read-only `/api/health` preflight and requires `ok: true`, `status: "ready"`, and `environment: "staging"` before collecting performance samples.

Performance samples now also reject malformed HTTP status values as evidence.

This record intentionally does not claim typecheck, lint, unit tests, build, browser E2E, or staging performance as passing until those commands have actually executed against this head (or a documented evidence-only descendant with no runtime/config changes).

Provider note: Vercel attempted verification for this branch but is blocked by the account build-rate limit. No Production deployment, database command, migration execution, environment-variable mutation, or provider configuration change is authorized by this record.
