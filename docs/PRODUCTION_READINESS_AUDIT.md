# Production readiness audit

Audit date: 2026-07-20. This document is a readiness assessment, not a
deployment authorization.

## Source evidence

- `npm run test`: 123 passing tests at the start of this audit.
- Typecheck, lint, Prisma schema validation, and webpack production build are
  required final gates and must be rerun on the release commit.
- Prisma Client is generated during `npm run build`.
- No new Phase Z product feature or schema change is introduced.

## Database and migration gate

- Operator-reported `loyalflow_test` state: 21 migrations, up to date.
- This agent environment cannot resolve the configured Neon hostname; it must
  not claim a live migration result.
- Before deployment, run `npm run db:migrate:status` against the intended
  target, review every migration, then use `npm run db:migrate:deploy` in the
  approved controlled migration job. Never use `migrate dev`, `db push`, or
  `migrate reset` in production.
- The operational backup, recovery, readiness, rate-limit, and smoke-test
  sequence is documented in `docs/PRODUCTION_DEPLOYMENT.md`; release owners
  must still record the actual restore point and incident decision owner.

## Security review

| Area | Current source evidence | Production gate |
| --- | --- | --- |
| Auth | JWT staff credentials, active user/business checks, logout/session invalidation. | UAT each account state and set production secret. |
| Authorization | Capability helpers scope user/business; role tests cover Owner/Manager/Staff/Viewer. | Execute direct-route/form UAT across tenants. |
| Tenant/branch | Tenant predicates and branch access helpers are tested. | Database/browser negative tests. |
| Public tokens | Opaque card tokens, strict scanner parser, public API excludes notes/tags. | Treat token as bearer capability; test revocation/inactive states. |
| Rate/idempotency | Process-local rapid earn/redeem and public join limits plus DB checks. | Adopt platform/edge-backed rate limiting before high-volume production. |
| Audit | BusinessActivity records core operational changes. | Retention, access, and incident-review policy required. |
| Secrets | `.env*` is ignored; no key is in source. | Configure host secret manager and rotation/least privilege. |
| Headers | CSP/security headers are configured. | Verify on deployed HTTPS origin. |

## Environment variable checklist

Names only; never put values in tickets, logs, source control, or browser code.

| Name | Production status |
| --- | --- |
| `DATABASE_URL` | Required, server-only, TLS verification. |
| `AUTH_SECRET` | Required, server-only, long random value. |
| `NEXT_PUBLIC_APP_URL` | Required canonical HTTPS public origin. |
| `AUTH_TRUST_HOST` | Confirm required setting for chosen NextAuth/Vercel host configuration. |
| `GOOGLE_SPREADSHEET_ID` | Optional; set only when the Sheets mirror is intentionally enabled. |
| `GOOGLE_WALLET_ENABLED` | Keep `false`; readiness only. |
| `GOOGLE_WALLET_ISSUER_ID` | Leave unset until separately approved Wallet activation. |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | Do not configure until approved server-only provider adapter exists. |

## Vercel readiness

- `.vercel/repo.json` links this checkout to the `loyalflow` project; no remote
  production build/log has been verified.
- Confirm Vercel uses the release commit, runs `prisma generate` through the
  build script, has the exact production environment names above, and uses the
  canonical HTTPS `NEXT_PUBLIC_APP_URL`.
- Decide and document the approved migration deployment step before release.
- Do not deploy from this audit.

## Observability and reconciliation

- Existing BusinessActivity is the operational audit source. `/api/health/live`
  is liveness-only and `/api/health` performs a lightweight read-only readiness
  probe without exposing database details. No centralized production
  monitoring/alerting evidence is verified.
- Free-compatible options to evaluate separately: Vercel logs/alerts within
  plan limits, structured server logs with redaction, Neon metrics, and a
  scheduled reconciliation report comparing customer balance to ledger sums.
- Google Wallet, event delivery, customer wallet, and billing remain disabled;
  no provider reconciliation is needed today.
