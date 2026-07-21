# LoyalFlow environment checklist

Copy `.env.example` to `.env` for local development. Never commit a populated
`.env`, and never expose any server-only value with a `NEXT_PUBLIC_` prefix.

| Variable | Required | Purpose | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL/Neon connection used by Prisma and the admin script. | Server-only. Use the Neon pooled/direct connection recommended for the deployment runtime and TLS verification. |
| `AUTH_SECRET` | Yes in deployed environments | NextAuth v5 JWT signing secret. | Generate a long random value; rotate deliberately because rotation invalidates sessions. |
| `AUTH_TRUST_HOST` | Confirm for the chosen NextAuth/Vercel deployment configuration. | Explicit host-trust configuration when required by the deployment topology. | Server-only configuration; verify against the deployed canonical origin. |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Canonical public application URL for card, QR, and Google Sheets links. | Must be an HTTPS origin without a trailing slash. This is intentionally public, so never place a secret here. |
| `GOOGLE_SPREADSHEET_ID` | Optional | Enables the existing Google Sheets mirror. | Server-only. Leave unset to keep the optional sync disabled. |
| `GOOGLE_WALLET_ENABLED` | Optional/reserved | Enables a future Wallet provider adapter. | Keep `false` for the current readiness-only implementation. |
| `GOOGLE_WALLET_ISSUER_ID` | Future activation only | Google Wallet issuer identifier. | Leave unset until a separately approved issuer/API activation. |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | Future activation only | Server-only Google Wallet service-account material. | Do not set, log, or commit until a separately approved provider adapter and secret-management review exist. |

## Deployment gate

Before a Vercel production deployment:

1. Set all required variables for Production and Preview as appropriate.
2. Confirm `NEXT_PUBLIC_APP_URL` points to the production HTTPS domain.
3. Run `npx prisma migrate status` against the intended database. Apply migrations only through the approved deployment process.
4. Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
5. Confirm the Vercel build log generated Prisma Client and completed the production build.
6. Perform the isolated consolidated owner, manager, staff, viewer, customer,
   and super-admin UAT in `docs/CONSOLIDATED_UAT_RUNBOOK.md`; do not use
   production customer data for test cases.
7. Assign a backup/restore owner, document RPO/RTO, and retain a successful
   restore-drill record before release approval.

## Current external blocker

As of 2026-07-20, the configured Neon hostname does not resolve from this
agent workspace (`ENOTFOUND`). The operator's local `loyalflow_test` terminal
has separately verified the migration history. The sandbox limitation prevents
this agent from claiming a fresh live migration result; it does not authorize a
migration retry, database reset, or schema change.
