# T004 Vercel Environment Evidence — 2026-08-09

Source: user-provided read-only screenshots of the Vercel project Environment Variables and Deployment pages. Secret values were not inspected or recorded.

## Observed environment scoping

Earlier screenshots showed:

- `LOYALFLOW_ENVIRONMENT` — Production only.
- `PASSWORD_RESET_FROM_EMAIL` — Production only.
- `RESEND_API_KEY` — Production only.
- `GOOGLE_PRIVATE_KEY` — Production only.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Production only.
- `LOYALFLOW_RELEASE_SHA` — Production only.
- `LOYALFLOW_PRODUCTION_DATABASE` — Production only.
- `AUTH_SECRET` — one Production-scoped entry and a separate Preview-scoped entry.
- `JWT_SECRET` — one Production-scoped entry and a separate Preview-scoped entry.
- `NEXT_PUBLIC_APP_URL` — Production and Preview.
- `AUTH_TRUST_HOST` — Production and Preview.
- `GOOGLE_SPREADSHEET_ID` — Production and Preview.

The original evidence also showed `DATABASE_URL` scoped to both Production and Preview. The project owner approved separating the Preview database connection from Production.

A later screenshot captured after that corrective change now shows:

- `DATABASE_URL` — **Production only**.

No secret value was revealed in the evidence.

## Security interpretation

The provider evidence now proves that the production `DATABASE_URL` is no longer exposed to Preview through the same Vercel environment-variable entry. This closes the first half of the database-scope defect.

However, Preview/Staging database isolation is still **not fully verified** because there is not yet evidence of a separate Preview-only `DATABASE_URL` that points to a non-production database target. Until that exists, Preview deployments may simply lack a database connection rather than having an isolated non-production database.

The separate Production and Preview entries for `AUTH_SECRET` and `JWT_SECRET` remain positive evidence of a distinct secret boundary for those credentials.

`LOYALFLOW_ENVIRONMENT` remains visible only for Production in the provided evidence. No provider-side evidence yet establishes a dedicated `staging` identity.

## Production deployment evidence

A Vercel deployment screenshot shows a production deployment in `Ready Latest` state from branch `main`. Runtime Logs and Observability are available in the project UI. Speed Insights and Web Analytics are shown as not enabled. The screenshot does not prove any external alert policy, delivered alert, or accountable alert recipient.

## Approved corrective action

On 2026-08-09, the project owner explicitly approved separating the Preview `DATABASE_URL` from Production.

This approval is limited to Vercel/provider configuration needed to ensure Preview uses a distinct non-production database connection. It does **not** authorise any production database command, migration, data copy, backfill, schema change, destructive database action, production deployment, or unrelated provider mutation.

Execution is partially verified:

- [x] Production `DATABASE_URL` is scoped to Production only.
- [ ] Preview has its own `DATABASE_URL` scoped to Preview only.
- [ ] The Preview value points to a non-production database target.
- [ ] No production customer data is intentionally copied into the Preview database as part of this change.

## T004 conclusion

Status: **PARTIAL ISOLATION VERIFIED — PREVIEW DATABASE STILL REQUIRED**.

The repository must not claim that staging/preview database isolation is complete until a separate non-production Preview database connection is configured and provider evidence is captured and reviewed.
