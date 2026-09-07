# LoyalFlow environment checklist

## Environment identity and database-script safety

`lib/server/environment-identity.ts` derives only safe metadata for development, test,
preview, staging, and production. `LOYALFLOW_ENVIRONMENT` is the preferred explicit
identity; supported deployment/Node signals are a fallback. Ambiguous identity fails
closed for database-sensitive scripts and never returns database URLs, credentials, or
raw environment values.

Database scripts are classified as runtime application, migration deployer, development
migration generator, seed/fixture, destructive reset, controlled operation, read-only
verification, or backup/restore documentation. The reusable guard in
`lib/server/database-script-guard.ts` permits fixture/destructive work only in the
reviewed environment class. Preview and staging fixture/reset execution is refused;
production destructive work requires the documented explicit override
`LOYALFLOW_ALLOW_PRODUCTION_MUTATION=I_UNDERSTAND_PRODUCTION_MUTATION` plus existing
script-specific confirmation and database identity checks. Super Admin creation and
password reset are controlled operations, not fixtures, and use the same production
override requirement.

Public link origins are resolved only from `NEXT_PUBLIC_APP_URL` or the local/test
fallback. Preview, staging, and production require an explicit canonical origin.
Request `Host` and forwarded headers never select QR, card, join, icon, or manifest
link origins.

Copy `.env.example` to `.env` for local development. Never commit a populated
`.env`, and never expose any server-only value with a `NEXT_PUBLIC_` prefix.

| Variable | Required | Purpose | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL/Neon connection used by Prisma and server-side admin tooling. | Server-only. Required by running application code. Use the Neon pooled/direct connection recommended for the deployment runtime and TLS verification. |
| `AUTH_SECRET` | Yes in deployed environments | NextAuth v5 JWT signing secret. | Generate a long random value; rotate deliberately because rotation invalidates sessions. |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Canonical public application URL for card, QR, and Google Sheets links. | Must be an HTTPS origin without a trailing slash. This is intentionally public, so never place a secret here. |
| `SHADOW_DATABASE_URL` | No at runtime | Prisma development-only shadow database. | Keep separate from runtime/production. It is not needed by the application or `prisma migrate deploy`. |
| `AUTH_TRUST_HOST` | Confirm for the chosen NextAuth/Vercel deployment configuration. | Explicit host-trust configuration when required by the deployment topology. | LoyalFlow does not read it directly; verify it against the deployed canonical origin when the host requires it. |
| `GOOGLE_SPREADSHEET_ID` | Optional | Enables the Google Sheets mirror. | Server-only. Leave unset to keep the optional sync disabled. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Required when Sheets is enabled | Google service-account email. | Server-only Vercel environment variable. |
| `GOOGLE_PRIVATE_KEY` | Required when Sheets is enabled | Google service-account private key. | Server-only Vercel environment variable; use literal `\n` escapes or a multiline secret. Never log it. |
| `GOOGLE_WALLET_ENABLED` | Optional/reserved | Enables a future Wallet provider adapter. | Keep `false` for the current readiness-only implementation. |
| `GOOGLE_WALLET_ISSUER_ID` | Future activation only | Google Wallet issuer identifier. | Leave unset until a separately approved issuer/API activation. |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | Future activation only | Server-only Google Wallet service-account material. | Do not set, log, or commit until a separately approved provider adapter and secret-management review exist. |

## Deployment gate

Before a Vercel production deployment:

1. Set all required variables for Production and Preview as appropriate.
2. Confirm `NEXT_PUBLIC_APP_URL` points to the production HTTPS domain.
3. Run `pnpm run db:migrate:status` against the intended database. Apply migrations only through `pnpm run db:migrate:deploy`; never use `migrate dev`, `db push`, or `migrate reset` in production.
4. Run `pnpm test`, `pnpm run typecheck`, `pnpm run validate:workspace`, `pnpm run lint`, and `pnpm run build`.
5. Confirm the Vercel build log generated Prisma Client and completed the production build.
6. Perform the isolated consolidated owner, manager, staff, viewer, customer,
   and super-admin UAT in `docs/CONSOLIDATED_UAT_RUNBOOK.md`; do not use
   production customer data for test cases.
7. Assign a backup/restore owner, document RPO/RTO, and retain a successful
   restore-drill record before release approval.

See `docs/PRODUCTION_DEPLOYMENT.md` for the required backup, migration,
readiness, smoke-test, rate-limit, and incident sequence.

## Runtime evidence boundary

Repository validation proves source and disposable-database behavior only.
Actual Preview, Staging, and Production variable scope, database identity, and
provider readiness must be verified against the selected deployment at its
exact release SHA without printing values. A historical connectivity failure
or an earlier successful deployment is not current-environment evidence.
