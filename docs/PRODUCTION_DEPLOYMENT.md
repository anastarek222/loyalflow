# LoyalFlow production deployment

This runbook prepares a release; it does not authorize a deploy or database
change by itself. Run every database command against the explicitly verified
target and never print its connection string in tickets, logs, or chat.

## Runtime environment

Required in production:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-only Prisma connection string. |
| `AUTH_SECRET` | Server-only Auth.js JWT signing secret. |
| `NEXT_PUBLIC_APP_URL` | Canonical public HTTPS origin, without a trailing slash. |

`NEXT_PUBLIC_APP_URL` is public by design. All other runtime variables above
remain server-only. `SHADOW_DATABASE_URL` is **not** a runtime requirement; it
is optional Prisma development tooling configuration and must remain separate
from the production/runtime database.

Optional integrations:

- Google Sheets sync is disabled when `GOOGLE_SPREADSHEET_ID` is absent. If it
  is enabled, its service-account file must be supplied securely at
  `secrets/google-service-account.json`; never commit or log it.
- Google Wallet has no active provider adapter. Keep its flag disabled unless a
  separately reviewed provider activation is approved.
- `AUTH_TRUST_HOST` is not read by LoyalFlow source. Confirm it only if the
  selected Auth.js hosting topology requires it.

## Database safety and recovery

1. Test each reviewed migration against `loyalflow_test` first.
2. Before a high-risk production migration, take or confirm a Neon restore
   point or branch and record who owns restoration.
3. Verify the intended database target and migration history before applying.
4. Use `prisma migrate deploy` only. Do not use `migrate dev`, `db push`, or
   `migrate reset` in production.
5. Roll back with a forward-fix migration when safe. Use the confirmed Neon
   restore point/branch only when the incident warrants restoration and the
   data-loss decision has an explicit owner.

Recommended controlled migration job (with the verified production environment
already supplied by the deployment platform):

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run db:migrate:deploy
```

`npm run deploy:check` is a non-mutating pre-deploy gate that validates the
schema, checks migration status, and builds the app. It does not apply a
migration.

## Release checklist

1. Confirm required production variables are set without revealing values.
2. Confirm `DATABASE_URL` names the intended production target; keep
   `SHADOW_DATABASE_URL` separate and unset unless a local development Prisma
   workflow needs it.
3. Run `npm run db:migrate:status` and resolve any failed or pending migration
   decision before release.
4. Run the controlled migration command above, exactly once, after the backup
   or restore-point decision.
5. Run `npm run build` from the release commit.
6. After deployment, request `GET /api/health/live` and `GET /api/health`.
   Both must return HTTP 200 before traffic is considered ready.
7. Smoke-test login, business dashboard, customer lookup, earn, redeem, and a
   public card using non-production test accounts where possible.
8. At an incident decision point, stop rollout first. Choose a forward fix or
   the documented restore/branch path based on migration type and confirmed
   data impact.

## Rate limiting and observability

LoyalFlow's application limiter is intentionally process-local defense in
depth. It is not globally distributed and financial correctness does not
depend on it; database transactions and constraints remain authoritative.
Configure platform, edge, or global rate limiting for abuse-sensitive public
endpoints before high-volume production exposure.

Use platform logs and Neon metrics to investigate failures. LoyalFlow logs
compact, redacted server errors; never add credentials, tokens, connection
strings, or full customer records to log context.
